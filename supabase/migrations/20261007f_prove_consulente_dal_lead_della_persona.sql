-- La prova resta al consulente che ha gia' preso in carico la persona
--
-- `crm.prove_dal_mirror()` dava alla prova il consulente del suo lead. Se quel
-- lead non aveva nessuno ma la persona era gia' passata da un altro lead
-- assegnato (una richiesta, il tour), la prova restava senza consulente. Ora,
-- in coda al passo 5, la prova prende il consulente dell'ultimo lead assegnato
-- della persona (quello preso in carico per ultimo). Vale solo per le prove
-- aperte e senza consulente: chi e' gia' assegnato a mano non cambia.
--
-- Il 07/10/2026 riguardava 5 prove aperte. Parte da solo a ogni passata
-- (ogni 5 minuti).
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

do $$
declare
  def text;
  vecchio text := $a$   where l.id = pr.lead_id and pr.gestito_da is null and l.assegnato_a is not null and pr.esito is null;
$a$;
begin
  def := pg_get_functiondef('crm.prove_dal_mirror()'::regprocedure);
  if (length(def) - length(replace(def, vecchio, ''))) / length(vecchio) <> 1 then
    raise exception 'crm.prove_dal_mirror: passo 5 non trovato una volta sola';
  end if;
  execute replace(def, vecchio, vecchio || $b$
  -- 5b. Se il lead della prova non ha nessuno ma la persona e' gia' passata da un
  -- lead assegnato (richiesta, tour...), la prova va a quel consulente: l'ultimo
  -- che ha preso in carico un lead della persona.
  update public.prove pr set gestito_da = x.assegnato_a
    from (select distinct on (l.utente_id) l.utente_id, l.assegnato_a
            from public.lead l
           where l.assegnato_a is not null
           order by l.utente_id, coalesce(l.preso_in_carico_il, l.creato_il) desc) x
   where x.utente_id = pr.utente_id and pr.gestito_da is null and pr.esito is null;
$b$);
end;
$$;
