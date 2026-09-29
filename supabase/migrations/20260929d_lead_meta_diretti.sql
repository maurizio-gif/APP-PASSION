-- I lead dei moduli Meta, dritti nel CRM
--
-- Fino a oggi un lead dei moduli istantanei di Meta (pagina «Passion Fitness
-- Roma Tuscolana») passava da Zapier ad Airtable, e da li' nel CRM col sync.
-- Ora il workflow n8n «PASSION: Lead dai moduli Meta nel CRM» ogni 5 minuti
-- chiede a Meta i lead delle ultime 2 ore di ogni modulo (Graph API
-- /<form_id>/leads) e li manda a `crm-richiesta`, come i moduli del sito, con:
--
--   { "tipo": "lead", "fonte": "Meta Ads", "rif": "meta-<leadgen id>",
--     "nome", "cognome", "email", "telefono", "attivita", "orario_ricontatto",
--     "meta_campagna", "meta_adset", "meta_form" }
--
-- Qui `crm.nuova_richiesta()` impara a salvare campagna, gruppo di inserzioni
-- e modulo (come l'import da Airtable) e mette la campagna nel dettaglio della
-- fonte. Finche' Zapier scrive anche su Airtable, lo stesso lead torna col
-- sync: l'import lo riconosce (stessa persona, arrivata dai moduli nella
-- mezz'ora, 20260928n) e lo aggancia a questo invece di farne un secondo.
-- Lo stesso lead mandato due volte da Meta si riconosce dal `rif`.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

create or replace function crm.nuova_richiesta(p jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  tipo text := lower(trim(coalesce(p ->> 'tipo', '')));
  rif text := nullif(trim(coalesce(p ->> 'rif', '')), '');
  fonte_testo text := nullif(trim(regexp_replace(coalesce(p ->> 'fonte', ''), '^\s*\|\s*$', '')), '');
  campagna text := nullif(trim(coalesce(p ->> 'meta_campagna', '')), '');
  f text;
  u uuid;
  l uuid;
  pr uuid;
begin
  if tipo not in ('pass', 'referral', 'lead', 'tour') then
    raise exception 'tipo non valido: %', coalesce(p ->> 'tipo', '(vuoto)');
  end if;
  if nullif(trim(coalesce(p ->> 'email', '')), '') is null and nullif(trim(coalesce(p ->> 'telefono', '')), '') is null then
    raise exception 'serve almeno email o telefono';
  end if;
  if fonte_testo ~* 'test' then
    return null;
  end if;

  -- La stessa richiesta mandata due volte.
  if rif is not null then
    select id into l from public.lead where richiesta_id = rif;
    if l is not null then return l; end if;
  end if;

  u := crm.persona(p ->> 'nome', p ->> 'cognome', p ->> 'email', p ->> 'telefono');
  f := crm.fonte_da_testo(tipo, fonte_testo);

  -- Gia' arrivata per un'altra strada nella mezz'ora: e' la stessa richiesta.
  select id into l from public.lead
   where utente_id = u and fonte = f and creato_il > now() - interval '30 minutes'
   order by creato_il desc limit 1;
  if l is not null then
    update public.lead
       set richiesta_id = coalesce(richiesta_id, rif),
           meta_campagna = coalesce(meta_campagna, campagna),
           meta_adset = coalesce(meta_adset, nullif(trim(coalesce(p ->> 'meta_adset', '')), '')),
           meta_form = coalesce(meta_form, nullif(trim(coalesce(p ->> 'meta_form', '')), ''))
     where id = l;
    return l;
  end if;

  insert into public.lead (utente_id, fonte, fonte_dettaglio, attivita_interesse, orario_ricontatto, presentato_da,
                           meta_campagna, meta_adset, meta_form,
                           fase, esito, chiuso_il, creato_il, aggiornato_il, origine, richiesta_id)
  values (u, f,
          case f when 'sito' then coalesce(lower(substring(fonte_testo from '(?i)(btn_[a-z_]+|floating[-_]btn)')), fonte_testo)
                 when 'meta' then coalesce(campagna, fonte_testo)
                 else fonte_testo end,
          nullif(trim(coalesce(p ->> 'attivita', '')), ''),
          nullif(trim(coalesce(p ->> 'orario_ricontatto', '')), ''),
          nullif(trim(coalesce(p ->> 'presentato_da', '')), ''),
          campagna,
          nullif(trim(coalesce(p ->> 'meta_adset', '')), ''),
          nullif(trim(coalesce(p ->> 'meta_form', '')), ''),
          case when tipo = 'pass' then 'vinta' else 'da_gestire' end,
          case when tipo = 'pass' then 'prova' end,
          case when tipo = 'pass' then now() end,
          now(), now(), 'n8n', rif)
  returning id into l;

  if tipo = 'pass' then
    -- La prova puo' essere gia' arrivata dal mirror: si aggancia a quella.
    select id into pr from public.prove
     where utente_id = u and lead_id is null and data_inizio > now() - interval '3 days'
     order by creato_il desc limit 1;
    if pr is not null then
      update public.prove set lead_id = l where id = pr;
    else
      insert into public.prove (utente_id, lead_id, tipo_pass, data_inizio, creato_il, origine)
      values (u, l, nullif(trim(coalesce(p ->> 'attivita', '')), ''), now(), now(), 'sito');
    end if;
  end if;
  return l;
end;
$$;

revoke all on function crm.nuova_richiesta(jsonb) from public, anon, authenticated;
