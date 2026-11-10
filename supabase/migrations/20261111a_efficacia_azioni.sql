-- Efficacia delle azioni istruttore
--
-- Una pagina nel gruppo Analisi («Efficacia azioni», sezione `efficacia_azioni`: gli admin
-- la vedono sempre, un altro la riceve dalle sezioni di Utenti) che dice quante persone,
-- dopo l'azione, hanno prenotato una lezione Formula 8, attivato l'add on Formula 8 o
-- l'abbonamento Formula 8.
--
-- Come si conta, per ogni azione (benvenuto o recupero):
--   - «dal»: il giorno in cui l'azione e' stata chiusa; se e' ancora aperta, il giorno in cui e' nata;
--   - la finestra: `p_giorni` giorni dal «dal» (0 = fino a oggi);
--   - prenotata: una lezione della categoria Formula 8 (8), non annullata e non in lista d'attesa,
--     che cade nella finestra;
--   - abbonamento Formula 8: un contratto di un piano «Formula 8» che non e' un aggiuntivo,
--     che parte nella finestra; add on: lo stesso con un piano aggiuntivo (Formula 8 - Add On,
--     Prenotazione No Stress...);
--   - attivato: add on o abbonamento.
-- Le azioni lavorate (chiuse) si confrontano con quelle non ancora lavorate: queste ultime
-- dicono quante ne arrivano comunque, senza che nessuno chiami. Non e' un test controllato
-- (chi viene chiamato prima non e' scelto a caso), quindi e' un confronto da leggere con cautela.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

alter table public.staff drop constraint if exists staff_sezioni_note;
alter table public.staff add constraint staff_sezioni_note check (sezioni <@ array[
  'lead', 'prove', 'contratti', 'disdette', 'rinnovi', 'task', 'cerca', 'debitori', 'abbonamenti',
  'ticket', 'curriculum', 'marketing', 'appello', 'appello_tutte', 'automazioni', 'efficacia_azioni']::text[]);

create or replace function crm.efficacia_azioni(p_giorni int default 30)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with z as (
    select a.tipo, a.esito, a.completato_da, (a.completato_il is not null) as lavorata, a.member_id,
           (coalesce(a.completato_il, a.creato_il) at time zone 'Europe/Rome')::date as dal,
           case when coalesce(p_giorni, 0) > 0
                then (coalesce(a.completato_il, a.creato_il) at time zone 'Europe/Rome')::date + p_giorni
                else '9999-12-31'::date end as al
      from public.azioni_istruttori a
      join public.utenti u on u.id = a.utente_id and not crm.cancellata(u.member_id)
  ), e as (
    select z.*,
           exists (select 1 from perfectgym.class_bookings b
                     join perfectgym.classes k on k.id = b.class_id
                     join perfectgym.class_types t on t.id = k.class_type_id
                    where b.member_id = z.member_id and not b.is_deleted
                      and not coalesce(b.annullata, false) and not coalesce(b.in_attesa, false)
                      and t.category_id = 8
                      and (k.inizio at time zone 'Europe/Rome')::date between z.dal and z.al) as prenotata,
           exists (select 1 from perfectgym.contracts c
                     join perfectgym.payment_plans pp on pp.id = c.payment_plan_id
                    where c.member_id = z.member_id and not c.is_deleted
                      and pp.nome ~* 'formula\s*8' and not coalesce(pp.aggiuntivo, false)
                      and c.data_inizio between z.dal and z.al) as abbonamento,
           exists (select 1 from perfectgym.contracts c
                     join perfectgym.payment_plans pp on pp.id = c.payment_plan_id
                    where c.member_id = z.member_id and not c.is_deleted
                      and pp.nome ~* 'formula\s*8' and coalesce(pp.aggiuntivo, false)
                      and c.data_inizio between z.dal and z.al) as addon
      from z
  )
  select jsonb_build_object(
    'generale', (select coalesce(jsonb_agg(to_jsonb(r) order by r.tipo, r.lavorata desc), '[]'::jsonb)
                   from (select tipo, lavorata, count(*) as azioni,
                                count(*) filter (where prenotata) as prenotata,
                                count(*) filter (where addon) as addon,
                                count(*) filter (where abbonamento) as abbonamento,
                                count(*) filter (where addon or abbonamento) as attivato
                           from e group by tipo, lavorata) r),
    'per_esito', (select coalesce(jsonb_agg(to_jsonb(r) order by r.tipo, r.azioni desc), '[]'::jsonb)
                    from (select tipo, esito, count(*) as azioni,
                                 count(*) filter (where prenotata) as prenotata,
                                 count(*) filter (where addon) as addon,
                                 count(*) filter (where abbonamento) as abbonamento,
                                 count(*) filter (where addon or abbonamento) as attivato
                            from e where lavorata group by tipo, esito) r),
    'per_istruttore', (select coalesce(jsonb_agg(to_jsonb(r) order by r.azioni desc, r.nome), '[]'::jsonb)
                         from (select e.completato_da as staff_id, crm.nome_staff(e.completato_da) as nome, count(*) as azioni,
                                      count(*) filter (where prenotata) as prenotata,
                                      count(*) filter (where addon) as addon,
                                      count(*) filter (where abbonamento) as abbonamento,
                                      count(*) filter (where addon or abbonamento) as attivato
                                 from e where lavorata group by e.completato_da) r))
$$;
revoke all on function crm.efficacia_azioni(int) from public, anon, authenticated;

create or replace function public.crm_efficacia_azioni(p_giorni int default 30)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform crm.chi();
  if not crm.puo_vedere('efficacia_azioni') then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  return crm.efficacia_azioni(p_giorni);
end;
$$;
revoke all on function public.crm_efficacia_azioni(int) from public, anon;
grant execute on function public.crm_efficacia_azioni(int) to authenticated;
