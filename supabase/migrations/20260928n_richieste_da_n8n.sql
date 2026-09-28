-- Le richieste dei moduli (n8n, cartella PASSION/RICHIESTE: PROVA PASSION,
-- REFERRAL PASSION) arrivano nel CRM direttamente, senza aspettare il giro
-- da Airtable. Le manda l'Edge Function `crm-richiesta`, che chiama
-- `crm.nuova_richiesta()` con quello che il modulo ha raccolto:
--
--   { "tipo": "pass" | "referral" | "lead" | "tour", "rif": "<id esecuzione n8n>",
--     "nome", "cognome", "email", "telefono", "attivita", "fonte", "presentato_da",
--     "orario_ricontatto" }
--
-- Le regole sono quelle dell'import da Airtable (20260928h): il Pass del sito
-- nasce come lead gia' vinto con la sua prova, il referral come lead da
-- gestire. Finche' i workflow scrivono anche su Airtable, lo stesso record
-- tornerebbe con l'import: l'import lo riconosce (stessa persona, arrivata
-- dai moduli nella mezz'ora) e lo aggancia al lead che c'e' gia'.

alter table public.lead drop constraint if exists lead_origine_check;
alter table public.lead add constraint lead_origine_check check (origine in ('airtable', 'app', 'n8n'));
alter table public.lead add column if not exists richiesta_id text unique;

-- La fonte dal testo "source | medium" dei moduli (lo stesso del campo Fonte di Airtable).
create or replace function crm.fonte_da_testo(p_tipo text, p_fonte text)
returns text
language sql immutable set search_path = ''
as $$
  select case
    when p_tipo = 'tour' then 'tour'
    when p_tipo = 'referral' then 'referral'
    when p_fonte ~* 'meta ads|fb \| paid' then 'meta'
    when p_fonte ~* 'sitoweb|btn_|floating|ply \||chatgpt|acquedotti' then 'sito'
    when p_fonte ~* '^tour$' then 'tour'
    when p_tipo = 'pass' then 'sito'
    else 'altro' end
$$;

create or replace function crm.nuova_richiesta(p jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  tipo text := lower(trim(coalesce(p ->> 'tipo', '')));
  rif text := nullif(trim(coalesce(p ->> 'rif', '')), '');
  fonte_testo text := nullif(trim(regexp_replace(coalesce(p ->> 'fonte', ''), '^\s*\|\s*$', '')), '');
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

  -- La stessa esecuzione mandata due volte.
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
    update public.lead set richiesta_id = coalesce(richiesta_id, rif) where id = l;
    return l;
  end if;

  insert into public.lead (utente_id, fonte, fonte_dettaglio, attivita_interesse, orario_ricontatto, presentato_da,
                           fase, esito, chiuso_il, creato_il, aggiornato_il, origine, richiesta_id)
  values (u, f,
          case f when 'sito' then coalesce(lower(substring(fonte_testo from '(?i)(btn_[a-z_]+|floating[-_]btn)')), fonte_testo)
                 else fonte_testo end,
          nullif(trim(coalesce(p ->> 'attivita', '')), ''),
          nullif(trim(coalesce(p ->> 'orario_ricontatto', '')), ''),
          nullif(trim(coalesce(p ->> 'presentato_da', '')), ''),
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
revoke all on function crm.fonte_da_testo(text, text) from public, anon, authenticated;

-- L'import da Airtable: se la persona e' gia' arrivata dai moduli nella
-- mezz'ora, il record di Airtable si aggancia a quel lead invece di farne un
-- secondo.
do $$
declare
  def text := pg_get_functiondef('airtable.importa_nuovi_lead()'::regprocedure);
  vecchio text := E'    u := crm.persona(r.dati ->> \'Nome\', r.dati ->> \'Cognome\', r.dati ->> \'Email\', r.dati ->> \'Cellulare\');\n';
  nuovo text := vecchio || E'    select x.id into l from public.lead x\n'
    || E'     where x.utente_id = u and x.origine = \'n8n\' and x.airtable_id is null\n'
    || E'       and x.creato_il between r.creato_il - interval \'30 minutes\' and r.creato_il + interval \'30 minutes\'\n'
    || E'     order by x.creato_il desc limit 1;\n'
    || E'    if l is not null then\n'
    || E'      update public.lead set airtable_id = r.id where id = l;\n'
    || E'      l := null;\n'
    || E'      continue;\n'
    || E'    end if;\n';
  nuova text := replace(def, vecchio, nuovo);
begin
  if nuova = def then raise exception 'importa_nuovi_lead: testo da sostituire non trovato'; end if;
  execute nuova;
end;
$$;
