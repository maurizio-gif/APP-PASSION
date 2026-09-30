-- Lead: la vista «Senza task»
--
-- I lead in gestione su cui nessuno ha fissato il prossimo passo: la persona
-- non ha nessun task aperto da oggi in avanti (ne' un task aperto senza data).
-- Ci stanno anche quelli che hanno solo task arretrati, non fatti: il passo
-- dopo non e' programmato. Il task conta sulla persona, qualunque cosa segua
-- (lead, prova, rinnovo...), come «Nota task» e «prossimo task» nell'elenco.
--
-- crm_lead() e' quella di 20260929g, con il caso 'senza_task'.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

create or replace function public.crm_lead(p_vista text default 'da_gestire', p_fonte text default null,
                                           p_testo text default null, p_limite integer default 200,
                                           p_consulente uuid default null)
returns table (id uuid, utente_id uuid, nome text, cognome text, telefono text, email text, member_id bigint,
               fonte text, fonte_dettaglio text, attivita_interesse text, orario_ricontatto text, presentato_da text,
               fase text, esito text, assegnato_a uuid, assegnato_nome text, preso_in_carico_il timestamptz,
               creato_il timestamptz, chiuso_il timestamptz, note text, commenti bigint, ultimo_commento text,
               ultimo_commento_il timestamptz, task_aperti bigint, prossimo_task timestamptz, note_task text)
language plpgsql
stable security definer
set search_path = ''
as $$
declare
  me uuid := crm.chi();
  parole text[] := array_remove(regexp_split_to_array(lower(trim(coalesce(p_testo, ''))), '\s+'), '');
  oggi timestamptz := date_trunc('day', now() at time zone 'Europe/Rome') at time zone 'Europe/Rome';
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
         (select string_agg(crm.nota_task(t), ', ' order by coalesce(t.completato_il, t.data, t.creato_il) desc)
            from public.task t where t.lead_id = l.id and crm.nota_task(t) is not null)
    from public.lead l
    join public.utenti u on u.id = l.utente_id
   where case coalesce(p_vista, 'da_gestire')
           when 'da_gestire' then l.fase = 'da_gestire'
           when 'in_gestione' then l.fase = 'in_gestione'
           when 'mie' then l.fase = 'in_gestione' and l.assegnato_a = me
           when 'senza_task' then l.fase = 'in_gestione'
                                  and not exists (select 1 from public.task t
                                                   where t.utente_id = u.id and t.completato_il is null
                                                     and not t.archiviato and (t.data is null or t.data >= oggi))
           when 'vinte' then l.fase = 'vinta'
           when 'perse' then l.fase = 'persa'
           else true end
     and (p_fonte is null or l.fonte = p_fonte)
     and (p_consulente is null or l.assegnato_a = p_consulente)
     and (cardinality(parole) = 0 or not exists (
           select 1 from unnest(parole) w
            where lower(concat_ws(' ', u.nome, u.cognome, u.email, u.telefono, u.telefono_norm)) not like '%' || w || '%'))
   order by case when p_vista in ('vinte', 'perse') then l.chiuso_il end desc nulls last,
            l.creato_il desc
   limit least(greatest(coalesce(p_limite, 200), 1), 500);
end;
$$;

revoke all on function public.crm_lead(text, text, text, integer, uuid) from public, anon;
grant execute on function public.crm_lead(text, text, text, integer, uuid) to authenticated;
