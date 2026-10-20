-- Report marketing: da dove arrivano i lead e fin dove arrivano
--
-- Una sezione nuova, «Marketing», che mette in fila le fonti dei lead (fonte,
-- campagna o bottone del sito, gruppo di inserzioni e modulo di Meta, attivita'
-- di interesse, mese di arrivo) e, per ognuna, il percorso fatto nel CRM:
--
--   lead → qualificato → (prova attivata) → iscritto
--
-- La prova e' un passaggio facoltativo: chi si iscrive puo' esserci passato o
-- no, e il report dice quanti si sono iscritti dopo una prova.
--
-- Si conta ogni lead (i doppioni di Airtable no) nel periodo in cui e' arrivato;
-- poi si guarda dove e' arrivato fino a oggi. I lead piu' recenti hanno avuto
-- meno tempo per arrivare in fondo: la pagina lo ricorda.
--
-- Le regole, lead per lead:
--
--   qualificato   qualcuno ha registrato un task fatto con esito «positivo» (di
--                 qualunque tipo: telefonata, WhatsApp, email, in sede) sul
--                 lead, o sulla persona nei giorni in cui il lead era vivo; e
--                 chi e' arrivato alla prova o all'iscrizione conta qualificato
--                 anche se nessuno ha registrato la telefonata (senza un
--                 contatto non si arriva li'; su Sito e Tour e' la norma);
--   prova         c'e' una prova collegata al lead con il Pass su PerfectGym o
--                 con un esito (iscritto / non iscritto); una richiesta di
--                 Pass senza Pass e senza esito non e' una prova, come in
--                 «Prove»; oppure il lead e' chiuso come «vinta / prova»;
--   iscritto      il lead e' «vinta / contratto» (lo segna da solo il CRM
--                 quando su PerfectGym compare l'abbonamento);
--   dopo prova    iscritto con una prova collegata al lead.
--
-- Il database non ha UTM (source, medium, term, content): la fonte e il
-- dettaglio sono quello che arriva dai moduli del sito, da Meta e da Airtable.
--
-- `crm_report_marketing(dimensione, dal, al, fonte)` ridisegna tutto a ogni
-- chiamata, niente si copia. Lo vede chi ha la sezione `marketing` (gli admin
-- sempre; i consulenti se Utenti gliela da').
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

-- La sezione: non entra nel default.
alter table public.staff drop constraint if exists staff_sezioni_note;
alter table public.staff add constraint staff_sezioni_note
  check (sezioni <@ array['lead', 'prove', 'contratti', 'disdette', 'rinnovi', 'task', 'cerca', 'debitori',
                          'abbonamenti', 'ticket', 'curriculum', 'marketing']);

create or replace function public.crm_report_marketing(
  p_dimensione text default 'fonte',
  p_dal date default null,
  p_al date default null,
  p_fonte text default null
)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  dim text := coalesce(p_dimensione, 'fonte');
  r jsonb;
begin
  perform crm.richiedi_sezione('marketing');
  if dim not in ('fonte', 'campagna', 'gruppo', 'modulo', 'attivita', 'mese') then
    raise exception 'Dimensione non valida: %', dim;
  end if;
  if p_fonte is not null and p_fonte not in ('sito', 'tour', 'referral', 'meta', 'altro') then
    raise exception 'Fonte non valida: %', p_fonte;
  end if;

  with arrivati as (
    select l.id, l.utente_id, l.fonte, l.fonte_dettaglio, l.attivita_interesse,
           l.meta_campagna, l.meta_adset, l.meta_form, l.fase, l.esito, l.creato_il, l.chiuso_il
      from public.lead l
     where l.doppione_di is null
       and (p_dal is null or (l.creato_il at time zone 'Europe/Rome')::date >= p_dal)
       and (p_al is null or (l.creato_il at time zone 'Europe/Rome')::date <= p_al)
       and (p_fonte is null or l.fonte = p_fonte)
       -- gruppo di inserzioni e modulo esistono solo per Meta
       and (dim not in ('gruppo', 'modulo') or l.fonte = 'meta')
  ),
  percorso as (
    select a.*,
           (a.fase = 'vinta' and a.esito = 'contratto') as iscritto,
           ((a.fase = 'vinta' and a.esito = 'prova')
            or exists (select 1 from public.prove p
                        where p.lead_id = a.id and (p.contract_id is not null or p.esito is not null))) as prova,
           exists (select 1 from public.prove p where p.lead_id = a.id
                    and (p.contract_id is not null or p.esito is not null)) as prova_collegata,
           exists (select 1 from public.task t
                    where t.completato_il is not null and t.esito = 'positivo'
                      and (t.lead_id = a.id
                           or (t.lead_id is null and t.utente_id = a.utente_id
                               and t.completato_il >= a.creato_il
                               and t.completato_il <= coalesce(a.chiuso_il, now()) + interval '1 day'))) as risposto
      from arrivati a
  ),
  voci as (
    select p.*,
           case when dim = 'campagna' then p.fonte end as fonte_riga,
           case dim
             when 'fonte' then p.fonte
             when 'campagna' then
               coalesce(case p.fonte
                          when 'meta' then coalesce(nullif(btrim(p.meta_campagna), ''), nullif(btrim(p.fonte_dettaglio), ''))
                          when 'sito' then replace(lower(nullif(btrim(p.fonte_dettaglio), '')), '-', '_')
                          else lower(nullif(btrim(p.fonte_dettaglio), ''))
                        end, '(non indicato)')
             when 'gruppo' then coalesce(nullif(btrim(p.meta_adset), ''), '(non indicato)')
             when 'modulo' then coalesce(nullif(btrim(p.meta_form), ''), '(non indicato)')
             when 'attivita' then
               coalesce(left(nullif(regexp_replace(lower(btrim(replace(coalesce(p.attivita_interesse, ''), '_', ' '))), '\s+', ' ', 'g'), ''), 60),
                        '(non indicata)')
             when 'mese' then to_char(date_trunc('month', p.creato_il at time zone 'Europe/Rome'), 'YYYY-MM-DD')
           end as etichetta
      from percorso p
  ),
  righe as (
    select v.fonte_riga as fonte, v.etichetta,
           count(*) as lead,
           count(*) filter (where v.risposto or v.prova or v.iscritto) as qualificati,
           count(*) filter (where v.prova) as prove,
           count(*) filter (where v.iscritto) as iscritti,
           count(*) filter (where v.iscritto and v.prova_collegata) as iscritti_dopo_prova
      from voci v
     group by v.fonte_riga, v.etichetta
  ),
  totale as (
    select count(*) as lead,
           count(*) filter (where risposto or prova or iscritto) as qualificati,
           count(*) filter (where prova) as prove,
           count(*) filter (where iscritto) as iscritti,
           count(*) filter (where iscritto and prova_collegata) as iscritti_dopo_prova
      from percorso
  )
  select jsonb_build_object(
           'dimensione', dim,
           'totale', (select to_jsonb(t) from totale t),
           'righe', coalesce((select jsonb_agg(to_jsonb(x) order by
                                     case when dim = 'mese' then x.etichetta end asc nulls last,
                                     x.lead desc, x.etichetta)
                                from (select * from righe order by lead desc, etichetta limit 300) x), '[]'::jsonb))
    into r;
  return r;
end;
$$;

revoke all on function public.crm_report_marketing(text, date, date, text) from public, anon;
grant execute on function public.crm_report_marketing(text, date, date, text) to authenticated;
