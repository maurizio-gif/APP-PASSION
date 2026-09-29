-- Prove e disdette si assegnano a un consulente
--
-- Lead, rinnovi, debitori e task hanno la loro tendina «A chi». Prove e
-- disdette avevano solo «la seguo io» (o il nome di chi scriveva l'esito). Ora
-- chi segue una prova o una disdetta (`gestito_da`) si sceglie da una tendina,
-- nella pagina della sezione e nella scheda persona:
--   - `crm_prova_aggiorna(..., p_assegnato)` e `crm_disdetta_aggiorna(...,
--     p_assegnato)`: l'operatore scelto (attivo); vuoto = come prima (la prova
--     la prende chi spunta «la seguo io» o scrive l'esito, la disdetta chi
--     scrive l'esito, se nessuno la segue gia');
--   - `crm_disdette()` restituisce anche `gestito_da`, e `crm_persona()` lo da'
--     per prove e disdette.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

drop function if exists public.crm_prova_aggiorna(uuid, text, text, text, boolean);
create function public.crm_prova_aggiorna(p_prova uuid, p_esito text default null, p_obiezione text default null,
                                          p_note text default null, p_gestisco boolean default false,
                                          p_assegnato uuid default null)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare me uuid := crm.chi();
begin
  if p_esito is not null and p_esito not in ('iscritto', 'non_iscritto', '') then raise exception 'Esito non valido'; end if;
  if p_assegnato is not null and not exists (select 1 from public.staff where id = p_assegnato and attivo) then
    raise exception 'Operatore non valido';
  end if;
  update public.prove
     set esito = nullif(p_esito, ''),
         obiezione = nullif(trim(coalesce(p_obiezione, '')), ''),
         note = nullif(trim(coalesce(p_note, '')), ''),
         gestito_da = coalesce(p_assegnato,
                               case when p_gestisco or nullif(p_esito, '') is not null then coalesce(gestito_da, me) else gestito_da end)
   where id = p_prova;
end;
$$;

drop function if exists public.crm_disdetta_aggiorna(uuid, text, text, text, text);
create function public.crm_disdetta_aggiorna(p_id uuid, p_esito text, p_contatto text, p_motivo text, p_note text,
                                             p_assegnato uuid default null)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare me uuid := crm.chi();
begin
  if p_assegnato is not null and not exists (select 1 from public.staff where id = p_assegnato and attivo) then
    raise exception 'Operatore non valido';
  end if;
  update public.disdette
     set esito = nullif(p_esito, ''), contatto = nullif(p_contatto, ''), motivo = nullif(trim(coalesce(p_motivo, '')), ''),
         note = nullif(trim(coalesce(p_note, '')), ''),
         gestito_da = coalesce(p_assegnato, gestito_da, case when nullif(p_esito, '') is not null then me end),
         gestito_il = case when nullif(p_esito, '') is not null then now() else gestito_il end
   where id = p_id;
end;
$$;

revoke all on function public.crm_prova_aggiorna(uuid, text, text, text, boolean, uuid),
                       public.crm_disdetta_aggiorna(uuid, text, text, text, text, uuid) from public, anon;
grant execute on function public.crm_prova_aggiorna(uuid, text, text, text, boolean, uuid),
                          public.crm_disdetta_aggiorna(uuid, text, text, text, text, uuid) to authenticated;

do $$
declare
  def text;
  nuova text;
begin
  -- crm_disdette(): anche chi la segue (l'id, per la tendina).
  def := pg_get_functiondef('public.crm_disdette(text,integer,uuid)'::regprocedure);
  nuova := replace(def, 'gestito_il timestamp with time zone, creato_il timestamp with time zone)',
                        'gestito_il timestamp with time zone, creato_il timestamp with time zone, gestito_da uuid)');
  if nuova = def then raise exception 'crm_disdette: colonne non trovate'; end if;
  def := nuova;
  nuova := replace(def, 'd.gestito_il, d.creato_il', 'd.gestito_il, d.creato_il, d.gestito_da');
  if nuova = def then raise exception 'crm_disdette: select non trovata'; end if;
  drop function public.crm_disdette(text, integer, uuid);
  execute nuova;
  revoke all on function public.crm_disdette(text, integer, uuid) from public, anon;
  grant execute on function public.crm_disdette(text, integer, uuid) to authenticated;

  -- crm_persona(): chi segue prove e disdette.
  def := pg_get_functiondef('public.crm_persona(uuid)'::regprocedure);
  nuova := replace(def, $a$'gestito_nome', crm.nome_staff(p.gestito_da), 'note', p.note)$a$,
                        $b$'gestito_nome', crm.nome_staff(p.gestito_da), 'gestito_da', p.gestito_da, 'note', p.note)$b$);
  if nuova = def then raise exception 'crm_persona: prove non trovate'; end if;
  def := nuova;
  nuova := replace(def, $a$'motivo', d.motivo, 'contatto', d.contatto, 'note', d.note)$a$,
                        $b$'motivo', d.motivo, 'contatto', d.contatto, 'note', d.note, 'gestito_da', d.gestito_da,
        'gestito_nome', crm.nome_staff(d.gestito_da))$b$);
  if nuova = def then raise exception 'crm_persona: disdette non trovate'; end if;
  execute nuova;
end;
$$;
