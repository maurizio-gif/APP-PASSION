-- La vista dei lead come la usavano su Airtable (Interface Commerciali ->
-- Opportunita'): accanto al commento anche le note dei task del lead, la
-- colonna «Nota task» ("nr", "nr attivato 7 gg online"...). Una colonna in
-- piu' nel risultato: la funzione si ricrea, con gli stessi permessi.

drop function if exists public.crm_lead(text, text, text, int);

create function public.crm_lead(p_vista text default 'da_gestire', p_fonte text default null, p_testo text default null, p_limite int default 200)
returns table (
  id uuid, utente_id uuid, nome text, cognome text, telefono text, email text, member_id bigint,
  fonte text, fonte_dettaglio text, attivita_interesse text, orario_ricontatto text, presentato_da text,
  fase text, esito text, assegnato_a uuid, assegnato_nome text, preso_in_carico_il timestamptz,
  creato_il timestamptz, chiuso_il timestamptz, note text,
  commenti bigint, ultimo_commento text, ultimo_commento_il timestamptz,
  task_aperti bigint, prossimo_task timestamptz, note_task text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := crm.chi();
  parole text[] := array_remove(regexp_split_to_array(lower(trim(coalesce(p_testo, ''))), '\s+'), '');
begin
  return query
  select l.id, u.id, u.nome, u.cognome, u.telefono, u.email, u.member_id,
         l.fonte, l.fonte_dettaglio, l.attivita_interesse, l.orario_ricontatto, l.presentato_da,
         l.fase, l.esito, l.assegnato_a, crm.nome_staff(l.assegnato_a), l.preso_in_carico_il,
         l.creato_il, l.chiuso_il, l.note,
         (select count(*) from public.commenti c where c.utente_id = u.id),
         (select c.testo from public.commenti c where c.utente_id = u.id order by c.creato_il desc limit 1),
         (select max(c.creato_il) from public.commenti c where c.utente_id = u.id),
         (select count(*) from public.task t where t.utente_id = u.id and t.completato_il is null),
         (select min(t.data) from public.task t where t.utente_id = u.id and t.completato_il is null),
         (select string_agg(t.nota, ', ' order by coalesce(t.data, t.creato_il) desc)
            from public.task t where t.lead_id = l.id and nullif(trim(t.nota), '') is not null)
    from public.lead l
    join public.utenti u on u.id = l.utente_id
   where case coalesce(p_vista, 'da_gestire')
           when 'da_gestire' then l.fase = 'da_gestire'
           when 'in_gestione' then l.fase = 'in_gestione'
           when 'mie' then l.fase = 'in_gestione' and l.assegnato_a = me
           when 'vinte' then l.fase = 'vinta'
           when 'perse' then l.fase = 'persa'
           else true end
     and (p_fonte is null or l.fonte = p_fonte)
     and (cardinality(parole) = 0 or not exists (
           select 1 from unnest(parole) w
            where lower(concat_ws(' ', u.nome, u.cognome, u.email, u.telefono, u.telefono_norm)) not like '%' || w || '%'))
   order by case when p_vista in ('vinte', 'perse') then l.chiuso_il end desc nulls last,
            l.creato_il desc
   limit least(greatest(coalesce(p_limite, 200), 1), 500);
end;
$$;

revoke all on function public.crm_lead(text, text, text, int) from public, anon;
grant execute on function public.crm_lead(text, text, text, int) to authenticated;
