-- Liste newsletter: liste dinamiche di persone da scaricare per le campagne email (ticket #1072)
--
-- Le campagne si fanno su Perfect Gym, che legge un CSV con una sola colonna, `UserNumber`.
-- Qui le liste si calcolano ogni volta sui dati di Perfect Gym che il CRM ha gia': sono
-- sempre aggiornate, nessuno le tiene a mano.
--
-- Le liste (chiave -> chi ci finisce):
--   attivi       un contratto in corso di qualunque tipo (socio, Wellhub, Fitprime, Employee, Pass),
--                tranne chi ha solo un Guest Pass
--   soci         un abbonamento vero in corso (non aggiuntivo, con canone > 0 o «OLD…»: la stessa regola
--                delle prove e delle azioni istruttore); niente Wellhub, Fitprime, Employee, Pass
--   terminati    nessun contratto in corso (Guest Pass compresi) e almeno un abbonamento vero finito,
--                oppure un Guest Pass finito senza essersi mai abbonato
--   lead         le persone registrate come lead su Perfect Gym (mai state socie)
--   guest_pass_attivi  un Guest Pass in corso
--   tutto        tutta l'anagrafica (soci, lead, guest)
--
-- «In corso»: contratto Current, in pausa o non ancora partito, con la fine non passata.
-- Finiscono nei file solo le persone con un'email. Chi ha detto no al «Consenso Marketing», o non
-- ha mai risposto, si toglie scegliendo «solo con consenso marketing».
-- Le vede chi ha la sezione `liste_newsletter` (gli admin sempre) o la sezione Marketing.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

alter table public.staff drop constraint if exists staff_sezioni_note;
alter table public.staff add constraint staff_sezioni_note check (sezioni <@ array[
  'lead', 'prove', 'contratti', 'disdette', 'rinnovi', 'task', 'cerca', 'debitori', 'abbonamenti',
  'ticket', 'curriculum', 'marketing', 'appello', 'appello_tutte', 'automazioni', 'efficacia_azioni',
  'liste_newsletter']::text[]);

create or replace function crm.puo_liste_newsletter()
returns boolean
language sql
stable security definer
set search_path = ''
as $$ select coalesce(crm.puo_vedere('liste_newsletter') or crm.puo_vedere('marketing'), false) $$;
revoke all on function crm.puo_liste_newsletter() from public, anon, authenticated;

-- Una riga per persona: il suo numero, se ha un'email, se ha dato il consenso marketing,
-- e in quali liste sta.
create or replace function crm.newsletter_base()
returns table(numero text, ha_email boolean, consenso boolean, liste text[])
language sql
stable
set search_path = ''
as $$
  with oggi as (select (now() at time zone 'Europe/Rome')::date as d),
  c as (
    select k.member_id,
           (not coalesce(pp.aggiuntivo, false) and (pp.canone > 0 or pp.nome ~* '^OLD')) as vero,
           (pp.nome ~* 'guest\s*pass') as guest,
           (k.stato in ('Current', 'Freezed', 'NotStarted') and (k.data_fine is null or k.data_fine >= oggi.d)) as incorso
      from perfectgym.contracts k
      join perfectgym.payment_plans pp on pp.id = k.payment_plan_id
      cross join oggi
     where not k.is_deleted
  ), d as (
    select member_id,
           bool_or(incorso and not guest) as altro_in_corso,
           bool_or(incorso and vero) as vero_in_corso,
           bool_or(vero) as vero_mai,
           bool_or(guest) as guest_mai,
           bool_or(incorso and guest) as guest_in_corso
      from c group by member_id
  ), p as (
    select m.numero,
           nullif(btrim(m.email), '') is not null and m.email like '%@%' as ha_email,
           coalesce(r.accettato, false) as consenso,
           coalesce(d.altro_in_corso, false) as attivo,
           coalesce(d.vero_in_corso, false) as socio,
           (not coalesce(d.altro_in_corso, false) and not coalesce(d.guest_in_corso, false)
              and (coalesce(d.vero_mai, false) or coalesce(d.guest_mai, false))) as terminato,
           (m.member_type = 'Lead') as lead,
           coalesce(d.guest_in_corso, false) as guest_attivo
      from perfectgym.members m
      left join d on d.member_id = m.id
      left join perfectgym.member_agreement_answers r
             on r.member_id = m.id and r.agreement_id = 3 and not r.is_deleted
     where not m.is_deleted and not crm.cancellata(m.id) and m.numero is not null
  )
  select p.numero, p.ha_email, p.consenso,
         array_remove(array[
           case when p.attivo then 'attivi' end,
           case when p.socio then 'soci' end,
           case when p.terminato then 'terminati' end,
           case when p.lead then 'lead' end,
           case when p.guest_attivo then 'guest_pass_attivi' end,
           'tutto'], null)
    from p
$$;
revoke all on function crm.newsletter_base() from public, anon, authenticated;

-- Quante persone ha ogni lista (solo con un'email): in tutto, e con il consenso marketing.
create or replace function public.crm_liste_newsletter()
returns jsonb
language plpgsql
stable security definer
set search_path = ''
as $$
begin
  perform crm.chi();
  if not crm.puo_liste_newsletter() then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object('chiave', l.chiave, 'tutti', x.tutti, 'con_consenso', x.con_consenso)
                              order by l.ordine), '[]'::jsonb)
      from (values ('attivi', 1), ('soci', 2), ('terminati', 3), ('lead', 4), ('guest_pass_attivi', 5), ('tutto', 6)) l(chiave, ordine)
      cross join lateral (
        select count(*) filter (where l.chiave = any (b.liste)) as tutti,
               count(*) filter (where l.chiave = any (b.liste) and b.consenso) as con_consenso
          from crm.newsletter_base() b
         where b.ha_email
      ) x
  );
end;
$$;
revoke all on function public.crm_liste_newsletter() from public, anon;
grant execute on function public.crm_liste_newsletter() to authenticated;

-- Il file da dare a Perfect Gym: una colonna `UserNumber`, un numero per riga.
create or replace function public.crm_lista_newsletter_csv(p_lista text, p_solo_consenso boolean default false)
returns text
language plpgsql
stable security definer
set search_path = ''
as $$
begin
  perform crm.chi();
  if not crm.puo_liste_newsletter() then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  if p_lista is null or p_lista <> all (array['attivi', 'soci', 'terminati', 'lead', 'guest_pass_attivi', 'tutto']) then
    raise exception 'Lista non valida: %', p_lista;
  end if;
  return 'UserNumber' || coalesce((
    select string_agg(E'\r\n' || b.numero, '' order by b.numero)
      from crm.newsletter_base() b
     where b.ha_email and p_lista = any (b.liste) and (not coalesce(p_solo_consenso, false) or b.consenso)
  ), '') || E'\r\n';
end;
$$;
revoke all on function public.crm_lista_newsletter_csv(text, boolean) from public, anon;
grant execute on function public.crm_lista_newsletter_csv(text, boolean) to authenticated;
