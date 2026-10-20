-- Report marketing: come vengono gestiti i lead (e «qualificato» corretto)
--
-- Oltre al percorso (qualificato, prova, iscritto) il report dice cosa succede
-- quando un lead viene preso in carico, per capire se un risultato basso e'
-- un problema di campagna o di come si lavora il lead.
--
-- COME SI REGISTRAVA (da come lavorano i colleghi, verificato sui dati):
--
--   fino ad aprile 2026 (Airtable)  si scriveva un commento («nr», segreteria,
--       «attacca», non raggiungibile...) a ogni chiamata senza risposta, e si
--       creava il task solo quando la persona rispondeva; i task non avevano
--       un esito;
--   da maggio 2026 (questo CRM)     ogni tentativo e' un task fatto, con esito
--       Positivo (ha risposto) o Negativo (non risponde, non interessato...).
--
-- Quindi, in questa versione (che corregge 20261020a, dove «qualificato» si
-- contava solo dai task Positivi e perdeva quasi tutto lo storico):
--
--   azione registrata  un task fatto, o un commento, sul lead o sulla persona
--                      nei giorni in cui il lead era vivo;
--   risposto           c'e' un task fatto con esito diverso da Negativo:
--                      Positivo, oppure senza esito (lo storico di Airtable,
--                      dove il task nasceva solo se la persona rispondeva).
--
-- Per ogni voce (fonte, campagna, mese...) `crm_report_marketing()` dice:
--
--   qualificati       risposto, oppure arrivato alla prova o all'iscrizione
--                     (come prima, ma con «risposto» corretto);
--   lavorati          i lead con almeno un'azione registrata;
--   azioni            le azioni registrate (somma): diviso i lavorati sono le
--                     azioni medie per lead;
--   mai_lavorati      senza nessuna azione registrata, ne' prova ne' iscrizione;
--   senza_risposta    lavorati, ma mai risposto, ne' prova ne' iscrizione;
--   entro_24h         il primo task o commento entro 24 ore dall'arrivo;
--   primo_contatto_ore  la mediana, in ore, fra l'arrivo e la prima azione;
--   persi, aperti     i lead persi, e quelli ancora da gestire o in gestione.
--
-- I task e i commenti si leggono in una passata sola per tutti i lead invece
-- di una ricerca per ogni lead (con tutto lo storico andava in timeout).
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

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
  -- Le azioni registrate di ogni lead: i task fatti e i commenti del lead, e
  -- quelli della persona senza lead nei giorni in cui il lead era vivo.
  azioni as (
    select x.lead_id, count(*) as n, min(x.quando) as primo, bool_or(x.risposto) as risposto
      from (
        select a.id as lead_id, t.completato_il as quando, (t.esito is distinct from 'negativo') as risposto
          from arrivati a
          join public.task t on t.lead_id = a.id
         where t.completato_il is not null
        union all
        select a.id, t.completato_il, (t.esito is distinct from 'negativo')
          from arrivati a
          join public.task t on t.lead_id is null and t.utente_id = a.utente_id
         where t.completato_il is not null
           and t.completato_il >= a.creato_il
           and t.completato_il <= coalesce(a.chiuso_il, now()) + interval '1 day'
        union all
        select a.id, c.creato_il, false
          from arrivati a
          join public.commenti c on c.lead_id = a.id
        union all
        select a.id, c.creato_il, false
          from arrivati a
          join public.commenti c on c.lead_id is null and c.utente_id = a.utente_id
         where c.creato_il >= a.creato_il
           and c.creato_il <= coalesce(a.chiuso_il, now()) + interval '1 day'
      ) x
     group by x.lead_id
  ),
  con_prova as (
    select distinct p.lead_id
      from public.prove p
      join arrivati a on a.id = p.lead_id
     where p.contract_id is not null or p.esito is not null
  ),
  percorso as (
    select a.*,
           (a.fase = 'vinta' and a.esito = 'contratto') as iscritto,
           ((a.fase = 'vinta' and a.esito = 'prova') or cp.lead_id is not null) as prova,
           (cp.lead_id is not null) as prova_collegata,
           coalesce(z.risposto, false) as risposto,
           coalesce(z.n, 0) as azioni,
           case when z.primo is not null
                then greatest(extract(epoch from (z.primo - a.creato_il)) / 3600, 0) end as ore_primo
      from arrivati a
      left join azioni z on z.lead_id = a.id
      left join con_prova cp on cp.lead_id = a.id
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
           count(*) filter (where v.iscritto and v.prova_collegata) as iscritti_dopo_prova,
           count(*) filter (where v.azioni > 0) as lavorati,
           coalesce(sum(v.azioni), 0)::int as azioni,
           count(*) filter (where v.azioni = 0 and not v.prova and not v.iscritto) as mai_lavorati,
           count(*) filter (where v.azioni > 0 and not (v.risposto or v.prova or v.iscritto)) as senza_risposta,
           count(*) filter (where v.ore_primo <= 24) as entro_24h,
           (percentile_cont(0.5) within group (order by v.ore_primo) filter (where v.ore_primo is not null))::numeric(10,1) as primo_contatto_ore,
           count(*) filter (where v.fase = 'persa') as persi,
           count(*) filter (where v.fase in ('da_gestire', 'in_gestione')) as aperti
      from voci v
     group by v.fonte_riga, v.etichetta
  ),
  totale as (
    select count(*) as lead,
           count(*) filter (where risposto or prova or iscritto) as qualificati,
           count(*) filter (where prova) as prove,
           count(*) filter (where iscritto) as iscritti,
           count(*) filter (where iscritto and prova_collegata) as iscritti_dopo_prova,
           count(*) filter (where azioni > 0) as lavorati,
           coalesce(sum(azioni), 0)::int as azioni,
           count(*) filter (where azioni = 0 and not prova and not iscritto) as mai_lavorati,
           count(*) filter (where azioni > 0 and not (risposto or prova or iscritto)) as senza_risposta,
           count(*) filter (where ore_primo <= 24) as entro_24h,
           (percentile_cont(0.5) within group (order by ore_primo) filter (where ore_primo is not null))::numeric(10,1) as primo_contatto_ore,
           count(*) filter (where fase = 'persa') as persi,
           count(*) filter (where fase in ('da_gestire', 'in_gestione')) as aperti
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
