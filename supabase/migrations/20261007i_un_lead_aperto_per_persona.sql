-- Un solo lead aperto per persona: le richieste ripetute si contano sul lead
--
-- Chi compilava il form piu' volte diventava ogni volta un lead nuovo (381
-- persone con piu' lead, fino a 5; 7 ancora aperti il 07/10/2026). Ora
-- `crm.nuova_richiesta()`:
--
--   aperto   se la persona ha gia' un lead aperto (da gestire o in gestione), di
--            qualsiasi fonte, la nuova richiesta non crea un lead: si conta su
--            quello (`lead.richieste`, `lead.ultima_richiesta_il`), che resta
--            a chi l'ha in carico. La stessa compilazione arrivata due volte
--            (stessa fonte, entro 30 minuti) non si conta;
--   chiuso   se i lead della persona sono tutti chiusi (vinti o persi) ne nasce
--            uno nuovo, con la sua fonte e la sua data: e' un altro ciclo;
--   pass     la richiesta di prova riprende quella ancora aperta della persona
--            (stesso lead o senza lead) fino a 7 giorni prima, invece di
--            aprirne un'altra.
--
-- `crm_persona()` restituisce `richieste` e `ultima_richiesta_il` per ogni lead.
-- I lead gia' doppi non si toccano: restano come sono, nello storico.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

alter table public.lead add column if not exists richieste integer not null default 1;
alter table public.lead add column if not exists ultima_richiesta_il timestamptz;

do $$
declare
  def text;
  nuova text;
  vecchio text;
  nuovo text;
begin
  def := pg_get_functiondef('crm.nuova_richiesta(jsonb)'::regprocedure);
  nuova := def;

  -- il blocco dei 30 minuti diventa «lead aperto della persona»
  vecchio := $a$  select id into l from public.lead
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
$a$;
  nuovo := $b$  select x.id, (x.fonte = f and greatest(x.creato_il, coalesce(x.ultima_richiesta_il, x.creato_il)) > now() - interval '30 minutes')
    into l, stessa
    from public.lead x
   where x.utente_id = u and x.fase in ('da_gestire', 'in_gestione')
   order by x.creato_il desc limit 1;
  if l is not null then
    update public.lead
       set richiesta_id = coalesce(richiesta_id, rif),
           meta_campagna = coalesce(meta_campagna, campagna),
           meta_adset = coalesce(meta_adset, nullif(trim(coalesce(p ->> 'meta_adset', '')), '')),
           meta_form = coalesce(meta_form, nullif(trim(coalesce(p ->> 'meta_form', '')), '')),
           attivita_interesse = coalesce(attivita_interesse, nullif(trim(coalesce(p ->> 'attivita', '')), '')),
           richieste = richieste + case when stessa then 0 else 1 end,
           ultima_richiesta_il = case when stessa then ultima_richiesta_il else now() end,
           aggiornato_il = case when stessa then aggiornato_il else now() end
     where id = l;
    if stessa or tipo <> 'pass' then return l; end if;
  end if;
$b$;
  if (length(nuova) - length(replace(nuova, vecchio, ''))) / length(vecchio) <> 1 then
    raise exception 'nuova_richiesta: blocco dei 30 minuti non trovato una volta sola';
  end if;
  nuova := replace(nuova, vecchio, nuovo);

  -- la variabile
  vecchio := E'  pr uuid;\nbegin';
  if (length(nuova) - length(replace(nuova, vecchio, ''))) / length(vecchio) <> 1 then
    raise exception 'nuova_richiesta: dichiarazioni non trovate una volta sola';
  end if;
  nuova := replace(nuova, vecchio, E'  pr uuid;\n  stessa boolean;\nbegin');

  -- l'insert del lead solo se non c'e' gia' quello aperto
  vecchio := '  insert into public.lead (utente_id, fonte, fonte_dettaglio,';
  if (length(nuova) - length(replace(nuova, vecchio, ''))) / length(vecchio) <> 1 then
    raise exception 'nuova_richiesta: insert non trovato una volta sola';
  end if;
  nuova := replace(nuova, vecchio, E'  if l is null then\n' || vecchio);
  vecchio := E'  returning id into l;\n  if tipo = ''pass'' then';
  if (length(nuova) - length(replace(nuova, vecchio, ''))) / length(vecchio) <> 1 then
    raise exception 'nuova_richiesta: fine dell''insert non trovata una volta sola';
  end if;
  nuova := replace(nuova, vecchio, E'  returning id into l;\n  end if;\n  if tipo = ''pass'' then');

  -- la richiesta di prova ancora aperta si riprende
  vecchio := $a$where utente_id = u and lead_id is null and data_inizio > now() - interval '3 days'$a$;
  if (length(nuova) - length(replace(nuova, vecchio, ''))) / length(vecchio) <> 1 then
    raise exception 'nuova_richiesta: ricerca della prova non trovata una volta sola';
  end if;
  nuova := replace(nuova, vecchio, $b$where utente_id = u and contract_id is null and esito is null
       and (lead_id is null or lead_id = l) and data_inizio > now() - interval '7 days'$b$);
  execute nuova;

  -- la scheda persona
  def := pg_get_functiondef('public.crm_persona(uuid)'::regprocedure);
  vecchio := $a$'consenso_privacy', l.consenso_privacy)$a$;
  if (length(def) - length(replace(def, vecchio, ''))) / length(vecchio) <> 1 then
    raise exception 'crm_persona: lead non trovati una volta sola';
  end if;
  execute replace(def, vecchio, $b$'consenso_privacy', l.consenso_privacy,
        'richieste', l.richieste, 'ultima_richiesta_il', l.ultima_richiesta_il)$b$);
end;
$$;
