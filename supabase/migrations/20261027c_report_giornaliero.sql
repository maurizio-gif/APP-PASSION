-- Il report giornaliero: tutto quello che e' successo in un giorno
--
-- `crm_report_giornaliero(p_giorno, p_consulente)` restituisce, per un giorno
-- di Roma (dalla mezzanotte alla mezzanotte), una riga per ogni cosa successa,
-- con la persona e il consulente. E' riservata agli admin (crm.e_admin()).
-- Il disegno lo fa la pagina «Report giornaliero»; non ha numeri suoi.
--
-- Cosa vuol dire «del giorno», tipo per tipo:
--
--   lead_arrivato     opportunita' nata quel giorno (lead.creato_il);
--   lead_preso        opportunita' presa in carico quel giorno;
--   lead_chiuso       opportunita' chiusa quel giorno, vinta o persa (la vincita
--                     la segna da sola PerfectGym quando compare il contratto);
--   commento          commento scritto quel giorno, dall'autore;
--   task_creato       task creato quel giorno, al consulente a cui e' assegnato;
--   task_fatto        task chiuso quel giorno dal personale (gli archiviati dal
--                     sistema non contano), con l'esito;
--   pass              Guest Pass o pass giornaliero firmato quel giorno
--                     (come nella dashboard Abbonamenti: i piani degli
--                     aggregatori restano fuori);
--   abbonamento       abbonamento a pagamento firmato quel giorno, «nuovo» o
--                     «rinnovo o cambio» (la regola dei 30 giorni degli
--                     Abbonamenti); sono fuori pass, add-on e canone zero;
--   disdetta_arrivata disdetta registrata quel giorno;
--   disdetta_gestita  disdetta gestita (esito, telefonata) quel giorno;
--   rinnovo_gestito   rinnovo chiuso quel giorno.
--
-- Il consulente di pass e abbonamenti e' quello dell'opportunita' che li ha
-- chiusi o, se non c'e', dell'ultima opportunita' assegnata alla persona.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

create or replace function public.crm_report_giornaliero(p_giorno date default null, p_consulente uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  giorno date := coalesce(p_giorno, (now() at time zone 'Europe/Rome')::date);
  club bigint := (select valore::bigint from crm.impostazioni where chiave = 'club_id');
  risultato jsonb;
begin
  if not crm.e_admin() then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;

  with
  contratti as materialized (
    select c.id, c.member_id, c.data_firma, c.data_inizio, c.data_fine, p.nome as piano, p.canone,
           crm.e_pass_prova(p.nome) as e_pass,
           (not crm.e_pass(p.nome) and p.canone > 0 and not coalesce(p.aggiuntivo, false)) as e_abbonamento
      from perfectgym.contracts c
      join perfectgym.payment_plans p on p.id = c.payment_plan_id
     where c.club_id = club and not c.is_deleted and coalesce(c.data_firma, c.data_inizio) = giorno
       and (crm.e_pass_prova(p.nome) or (not crm.e_pass(p.nome) and p.canone > 0 and not coalesce(p.aggiuntivo, false)))
  ),
  rinnovo as materialized (
    select a.id, a.rinnovo
      from crm.abbonamenti(giorno) a
     where a.id in (select k.id from contratti k where k.e_abbonamento)
  ),
  eventi as (
    -- Le opportunita'.
    select l.creato_il as ora, 'lead_arrivato' as tipo, l.fonte as sottotipo, l.fase as esito,
           l.attivita_interesse as titolo, l.fonte_dettaglio as dettaglio, l.assegnato_a as consulente_id, l.utente_id
      from public.lead l where (l.creato_il at time zone 'Europe/Rome')::date = giorno
    union all
    select l.preso_in_carico_il, 'lead_preso', l.fonte, l.fase, l.attivita_interesse, null, l.assegnato_a, l.utente_id
      from public.lead l where (l.preso_in_carico_il at time zone 'Europe/Rome')::date = giorno
    union all
    select l.chiuso_il, 'lead_chiuso', l.esito, l.fase, l.attivita_interesse, l.note, l.assegnato_a, l.utente_id
      from public.lead l where (l.chiuso_il at time zone 'Europe/Rome')::date = giorno
    -- I commenti.
    union all
    select c.creato_il, 'commento', null, null, null, c.testo, c.autore_id, c.utente_id
      from public.commenti c where (c.creato_il at time zone 'Europe/Rome')::date = giorno
    -- I task.
    union all
    select t.creato_il, 'task_creato', t.tipo, null, t.nota,
           case when t.data is not null then 'per il ' || to_char(t.data at time zone 'Europe/Rome', 'DD/MM/YYYY HH24:MI') end,
           t.assegnato_a, t.utente_id
      from public.task t where (t.creato_il at time zone 'Europe/Rome')::date = giorno
    union all
    select t.completato_il, 'task_fatto', t.tipo, t.esito, t.nota, nullif(t.nota_esito, ''), t.assegnato_a, t.utente_id
      from public.task t
     where not t.archiviato and (t.completato_il at time zone 'Europe/Rome')::date = giorno
    -- Pass e abbonamenti firmati.
    union all
    select null::timestamptz, case when k.e_pass then 'pass' else 'abbonamento' end,
           case when k.e_pass then null when r.rinnovo then 'rinnovo' else 'nuovo' end, null,
           k.piano,
           case when k.e_pass then 'dal ' || to_char(k.data_inizio, 'DD/MM/YYYY') || coalesce(' al ' || to_char(k.data_fine, 'DD/MM/YYYY'), '')
                else to_char(k.canone, 'FM999990D00') || ' € al mese' end,
           (select l.assegnato_a from public.lead l
             where l.utente_id in (select x.id from public.utenti x where x.member_id = k.member_id)
               and l.assegnato_a is not null
             order by (l.vinta_contract_id = k.id or l.contract_id = k.id) desc nulls last,
                      coalesce(l.preso_in_carico_il, l.creato_il) desc
             limit 1),
           -- Un socio puo' avere piu' anagrafiche: si prende quella con un'opportunita'.
           (select x.id from public.utenti x
             where x.member_id = k.member_id
             order by exists (select 1 from public.lead l where l.utente_id = x.id) desc, x.aggiornato_il desc
             limit 1)
      from contratti k
      left join rinnovo r on r.id = k.id
    -- Le disdette e i rinnovi.
    union all
    select d.creato_il, 'disdetta_arrivata', null, d.esito, null, d.motivo, d.gestito_da, d.utente_id
      from public.disdette d where (d.creato_il at time zone 'Europe/Rome')::date = giorno
    union all
    select d.gestito_il, 'disdetta_gestita', d.contatto, d.esito, null, coalesce(d.motivo, d.note), d.gestito_da, d.utente_id
      from public.disdette d where (d.gestito_il at time zone 'Europe/Rome')::date = giorno
    union all
    select r.gestito_il, 'rinnovo_gestito', null, r.esito, r.piano, r.note, r.assegnato_a, r.utente_id
      from public.rinnovi r where (r.gestito_il at time zone 'Europe/Rome')::date = giorno
  )
  select jsonb_build_object(
           'giorno', giorno,
           'eventi', coalesce(jsonb_agg(jsonb_build_object(
             'ora', e.ora,
             'tipo', e.tipo,
             'sottotipo', e.sottotipo,
             'esito', e.esito,
             'titolo', e.titolo,
             'dettaglio', e.dettaglio,
             'consulente_id', e.consulente_id,
             'consulente', crm.nome_staff(e.consulente_id),
             'utente_id', u.id,
             'nome', u.nome,
             'cognome', u.cognome,
             'telefono', u.telefono,
             'email', u.email) order by e.ora desc nulls last, u.cognome), '[]'::jsonb))
    into risultato
    from eventi e
    left join public.utenti u on u.id = e.utente_id
   where (p_consulente is null or e.consulente_id = p_consulente);

  return risultato;
end;
$$;

revoke all on function public.crm_report_giornaliero(date, uuid) from public, anon;
grant execute on function public.crm_report_giornaliero(date, uuid) to authenticated;
