-- Su Airtable un task con l'ESITO e' un task fatto
--
-- Da maggio 2026 lo staff non usa piu' il campo «Completato» dei Task: chiude
-- un task scrivendo l'ESITO TASK (POSITIVO / NEGATIVO) e la nota ("nr",
-- "attiva oggi 7 giorni"...). La ricostruzione (20260928g) guardava solo
-- «Completato», e cosi' nel CRM:
--   - 1.394 task gia' fatti su Airtable erano ancora aperti, e riempivano
--     «arretrati» e «oggi» dei consulenti (i task aperti veri erano 144);
--   - 2.599 erano finiti fra gli archiviati (20260928k), che ha anche
--     cancellato il loro esito.
--
-- Da qui: un task di Airtable e' fatto se «Completato» e' Si oppure se ha
-- l'ESITO. Il momento in cui e' stato fatto e' quello di «Quando un task viene
-- completato», se c'e', altrimenti la data del task (se non e' nel futuro),
-- altrimenti quando e' stato creato. Vale per quelli gia' nel CRM e per
-- quelli che arrivano col sync (`airtable.allinea_task`).
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

create or replace function airtable.task_fatto_il(d jsonb, p_creato timestamptz)
returns timestamptz
language sql stable set search_path = ''
as $$
  select case when d ->> 'Completato' = 'Si' or lower(d ->> 'ESITO TASK') in ('positivo', 'negativo') then
    coalesce(airtable.ts(d ->> 'Quando un task viene completato'),
             case when airtable.ts(d ->> 'Data del Task') <= now() then airtable.ts(d ->> 'Data del Task') end,
             airtable.ts(d ->> 'Created Task'), p_creato)
  end
$$;

-- Quelli gia' nel CRM: aperti o archiviati, con l'esito su Airtable. Un task
-- chiuso nel CRM (non archiviato) resta com'e'.
update public.task t
   set completato_il = airtable.task_fatto_il(r.dati, r.creato_il),
       esito = lower(r.dati ->> 'ESITO TASK'),
       archiviato = false
  from airtable.record r
 where r.tabella = 'Task' and r.id = t.airtable_id
   and lower(r.dati ->> 'ESITO TASK') in ('positivo', 'negativo')
   and (t.completato_il is null or t.archiviato);

-- Il sync: stessa regola.
do $$
declare
  def text := pg_get_functiondef('airtable.allinea_task(text,jsonb,timestamptz)'::regprocedure);
  vecchio text := E'fatto timestamptz := case when d ->> \'Completato\' = \'Si\'\n    then coalesce(airtable.ts(d ->> \'Quando un task viene completato\'), airtable.ts(d ->> \'Data del Task\'), p_creato) end;';
  nuova text := replace(def, vecchio, E'fatto timestamptz := airtable.task_fatto_il(d, p_creato);');
begin
  if nuova = def then raise exception 'allinea_task: testo da sostituire non trovato'; end if;
  execute nuova;
end;
$$;

revoke all on function airtable.task_fatto_il(jsonb, timestamptz) from public, anon, authenticated;
