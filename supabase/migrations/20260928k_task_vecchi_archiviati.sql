-- I task arrivati da Airtable ancora aperti con la data passata da piu' di 30
-- giorni: 2.622 il 28/09/2026, che riempivano gli "arretrati" di tutti. Per
-- scelta dell'utente si archiviano: si chiudono (completato_il) senza esito e
-- con `archiviato`, cosi' non contano fra gli aperti ma nemmeno fra i fatti, e
-- nella storia della persona restano al loro giorno, segnati come archiviati.

alter table public.task add column if not exists archiviato boolean not null default false;

update public.task
   set completato_il = now(), esito = null, archiviato = true
 where completato_il is null
   and data < now() - interval '30 days';

-- I fatti sono quelli fatti davvero.
do $$
declare
  def text := pg_get_functiondef('public.crm_task(text,text,int)'::regprocedure);
  nuova text := replace(def, 'when ''fatti'' then t.completato_il is not null',
                             'when ''fatti'' then t.completato_il is not null and not t.archiviato');
begin
  if nuova = def then raise exception 'crm_task: testo da sostituire non trovato'; end if;
  execute nuova;
end;
$$;

-- Nella storia: un task archiviato sta alla sua data, e lo dice.
do $$
declare
  def text := pg_get_functiondef('public.crm_persona(uuid)'::regprocedure);
  nuova text := replace(replace(def,
    'coalesce(t.completato_il, t.data, t.creato_il)',
    'coalesce(case when not t.archiviato then t.completato_il end, t.data, t.creato_il)'),
    '''esito'', t.esito,', '''esito'', t.esito, ''archiviato'', t.archiviato,');
begin
  if nuova = def or position('''archiviato'', t.archiviato' in nuova) = 0 then
    raise exception 'crm_persona: testo da sostituire non trovato';
  end if;
  execute nuova;
end;
$$;
