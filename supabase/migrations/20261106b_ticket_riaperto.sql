-- Ticket riaperti: si vede che erano gia' risolti, e si richiudono senza una nuova soluzione
--
-- Prima: un ticket riaperto («Riapri» con il motivo) tornava fra i ticket «Per R2D» come se
-- fosse nuovo, e per richiuderlo c'era solo il modulo con causa e soluzione da riscrivere.
-- Chi scriveva una nuova soluzione cancellava la vecchia, che spariva dalla vista.
--
-- Adesso:
--   1. crm_ticket_elenco dice, per i ticket aperti che erano gia' risolti, quando sono stati
--      riaperti, da chi e con quale motivo, e quando erano stati risolti (4 colonne in fondo);
--   2. crm_ticket_richiudi: richiude un ticket riaperto lasciando causa e soluzione di prima;
--   3. crm_ticket_risolvi: se si scrive una soluzione nuova su un ticket che ne aveva gia' una,
--      la vecchia resta scritta nel thread (evento «soluzione_precedente»).
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

-- 1. L'elenco: cambia il tipo restituito, quindi si ricrea.
drop function if exists public.crm_ticket_elenco(text, uuid);

create function public.crm_ticket_elenco(p_vista text default 'da_verificare', p_utente uuid default null)
 returns table(id bigint, tipo text, stato text, titolo text, bloccante boolean, utente_id uuid, nome text, cognome text,
               member_id bigint, aperto_da_nome text, aperto_il timestamptz, preso_nome text, aggiornato_il timestamptz,
               chiuso_il timestamptz, natura text, dal date, riunione date, doppione_di bigint, messaggi integer,
               allegati integer, ultimo_lato text,
               riaperto_il timestamptz, riaperto_da text, riaperto_motivo text, risolto_il timestamptz)
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare me uuid := crm.ticket_richiedi(null);
begin
  return query
    select t.id, t.tipo, t.stato, t.titolo, t.bloccante,
           t.utente_id, coalesce(nullif(pm.nome, ''), u.nome), coalesce(nullif(pm.cognome, ''), u.cognome), u.member_id,
           crm.nome_staff(t.aperto_da), t.aperto_il, crm.nome_staff(t.preso_da), t.aggiornato_il,
           t.chiuso_il, t.natura, t.dal, t.riunione, t.doppione_di,
           (select count(*)::int from public.ticket_messaggi m where m.ticket_id = t.id and m.testo is not null),
           (select count(*)::int from public.ticket_allegati a where a.ticket_id = t.id),
           (select m.lato from public.ticket_messaggi m where m.ticket_id = t.id and m.testo is not null
             order by m.creato_il desc limit 1),
           ri.creato_il, ri.nome, ri.testo, ri.risolto_il
      from public.ticket t
      left join public.utenti u on u.id = t.utente_id
      left join perfectgym.members pm on pm.id = u.member_id
      left join lateral (
        select m.creato_il, crm.nome_staff(m.autore) as nome, m.testo,
               (select max(x.creato_il) from public.ticket_messaggi x
                 where x.ticket_id = t.id and x.evento in ('risolto', 'risolto_desk') and x.creato_il < m.creato_il) as risolto_il
          from public.ticket_messaggi m
         where m.ticket_id = t.id and m.evento = 'riaperto'
           and t.stato in ('inviato', 'in_lavorazione', 'in_attesa') and t.soluzione is not null
         order by m.creato_il desc limit 1
      ) ri on true
     where (not crm.e_superadmin() or t.tipo = 'modifica' or t.inviato_il is not null or t.aperto_da = me) and case
             when p_utente is not null then t.utente_id = p_utente
             when p_vista = 'da_verificare' then t.stato = 'da_verificare'
             when p_vista = 'r2d' then t.stato in ('inviato', 'in_lavorazione')
             when p_vista = 'in_attesa' then t.stato = 'in_attesa'
             when p_vista = 'modifiche' then t.stato in ('da_confermare', 'confermata')
             when p_vista = 'miei' then t.aperto_da = me
                                        and t.stato not in ('risolto', 'risolto_desk', 'doppione', 'rilasciata', 'annullata')
             when p_vista = 'chiusi' then t.stato in ('risolto', 'risolto_desk', 'doppione', 'rilasciata', 'annullata')
                                          and t.chiuso_il >= now() - interval '90 days'
             when p_vista = 'tutti' then true
             else false
           end
     order by case when p_vista = 'chiusi' then t.chiuso_il end desc nulls last,
              case when p_utente is not null or p_vista = 'tutti' then t.aperto_il end desc nulls last,
              t.bloccante desc, t.aperto_il
     limit 300;
end;
$function$;

revoke all on function public.crm_ticket_elenco(text, uuid) from public, anon;
grant execute on function public.crm_ticket_elenco(text, uuid) to authenticated, service_role;

-- 2. Richiudere un ticket riaperto, senza una nuova soluzione.
create or replace function public.crm_ticket_richiudi(p_id bigint)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare me uuid := crm.ticket_richiedi('assistenza');
        t public.ticket := crm.ticket_prendi_riga(p_id);
begin
  if t.stato not in ('inviato', 'in_lavorazione', 'in_attesa') then
    raise exception 'Il ticket #% non è fra quelli mandati a R2D', t.id;
  end if;
  if t.soluzione is null or not exists (select 1 from public.ticket_messaggi m where m.ticket_id = t.id and m.evento = 'riaperto') then
    raise exception 'Il ticket #% non era già risolto: serve una soluzione', t.id;
  end if;
  update public.ticket
     set stato = 'risolto',
         preso_da = coalesce(preso_da, me), preso_il = coalesce(preso_il, now()),
         chiuso_da = me, chiuso_il = now(), aggiornato_il = now()
   where id = t.id;
  perform crm.ticket_evento(t.id, 'richiuso');
end;
$function$;

revoke all on function public.crm_ticket_richiudi(bigint) from public, anon;
grant execute on function public.crm_ticket_richiudi(bigint) to authenticated, service_role;

-- 3. Una soluzione nuova non cancella la vecchia: resta nel thread.
do $mig$
declare
  def text;
  vecchio text := $a$  update public.ticket
     set stato = 'risolto', natura = p_natura,$a$;
  nuovo text := $b$  if t.soluzione is not null then
    perform crm.ticket_evento(t.id, 'soluzione_precedente',
      concat_ws(E'\n', case when t.causa is not null then 'Causa: ' || t.causa end, 'Soluzione: ' || t.soluzione));
  end if;
  update public.ticket
     set stato = 'risolto', natura = p_natura,$b$;
  volte int;
begin
  def := pg_get_functiondef('public.crm_ticket_risolvi(bigint, text, text, text)'::regprocedure);
  volte := (length(def) - length(replace(def, vecchio, ''))) / length(vecchio);
  if volte <> 1 then
    raise exception 'crm_ticket_risolvi: il pezzo da cambiare compare % volte (atteso 1)', volte;
  end if;
  execute replace(def, vecchio, nuovo);
end
$mig$;
