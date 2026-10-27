-- Contratti senza consulente: un consulente suggerito
--
-- Per ogni contratto ancora da prendere in carico, `crm_iscrizioni` dice anche
-- chi ha gia' lavorato con la persona, per preselezionarlo nella tendina:
--
--   suggerito, suggerito_id    il consulente con piu' task fatti sulla persona
--                              (anche un tentativo) piu' prove che seguiva; a
--                              parita', quello che ha lavorato per ultimo;
--   motivo_suggerimento        perche': «3 task fatti (l'ultimo il 12/10) · seguiva la prova».
--
-- E' solo un suggerimento: non assegna niente. Chi prende in carico conferma
-- (o sceglie un altro) e scrive la nota, che resta obbligatoria. Si calcola solo
-- per i contratti da assegnare, sulle anagrafiche della persona, e solo per
-- operatori attivi. Un task non dice che abbia venduto lui: per questo non e'
-- un'assegnazione automatica.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

drop function if exists public.crm_iscrizioni(text, integer);

create or replace function public.crm_iscrizioni(p_vista text default 'da_assegnare', p_limite integer default 300)
returns table (contract_id bigint, utente_id uuid, nome text, cognome text, telefono text, email text,
               piano text, canone numeric, mesi integer, data_firma date, data_inizio date, stato text,
               consulente_id uuid, consulente text, assegnato_da text, assegnato_il timestamptz, note text, da_opportunita boolean,
               suggerito_id uuid, suggerito text, motivo_suggerimento text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform crm.richiedi_sezione('lead');
  return query
  select i.contract_id, u.id, coalesce(u.nome, m.nome), coalesce(u.cognome, m.cognome),
         coalesce(u.telefono, m.telefono), coalesce(u.email, m.email),
         i.piano, i.canone, i.mesi, i.data_firma, i.data_inizio, i.stato,
         i.consulente_id, crm.nome_staff(i.consulente_id), crm.nome_staff(i.assegnato_da), i.assegnato_il, i.note, i.da_opportunita,
         sg.staff_id, crm.nome_staff(sg.staff_id), sg.motivo
    from crm.iscrizioni_nuove() i
    left join perfectgym.members m on m.id = i.member_id
    left join lateral (select x.* from public.utenti x
                        where x.member_id = i.member_id
                        order by exists (select 1 from public.lead l where l.utente_id = x.id) desc, x.aggiornato_il desc
                        limit 1) u on true
    left join lateral (
      select s.staff_id, string_agg(s.motivo, ' · ' order by s.ord) as motivo
        from (select t.assegnato_a as staff_id, 1 as ord, count(*) as n, max(t.completato_il) as ultimo,
                     count(*) || case when count(*) = 1 then ' task fatto' else ' task fatti' end
                       || ' (l''ultimo il ' || to_char(max(t.completato_il) at time zone 'Europe/Rome', 'DD/MM') || ')' as motivo
                from public.task t
                join public.utenti x on x.id = t.utente_id
               where i.stato = 'da_assegnare' and x.member_id = i.member_id
                 and not t.archiviato and t.completato_il is not null and t.assegnato_a is not null
               group by t.assegnato_a
              union all
              select p.gestito_da, 2, count(*), max(p.data_fine), 'seguiva la prova'
                from public.prove p
                join public.utenti x on x.id = p.utente_id
               where i.stato = 'da_assegnare' and x.member_id = i.member_id and p.gestito_da is not null
               group by p.gestito_da) s
        join public.staff st on st.id = s.staff_id and st.attivo
       group by s.staff_id
       order by sum(s.n) desc, max(s.ultimo) desc
       limit 1) sg on true
   where case coalesce(p_vista, 'da_assegnare')
           when 'da_assegnare' then i.stato = 'da_assegnare'
           when 'assegnate' then i.stato = 'assegnata'
           when 'online' then i.stato = 'online'
           else true end
   order by i.data_firma desc, i.contract_id desc
   limit least(greatest(coalesce(p_limite, 300), 1), 1000);
end;
$$;

revoke all on function public.crm_iscrizioni(text, integer) from public, anon;
grant execute on function public.crm_iscrizioni(text, integer) to authenticated;
