-- La nota di chi fa il task («com'e' andata») resta sul task, in
-- `nota_esito`, e non diventa piu' un commento: su Airtable la colonna «Nota
-- task» dei lead e' proprio questa ("nr", "nr attivato 7 gg online"...), e i
-- commenti sono un'altra cosa. Un task chiuso come negativo senza nota vale
-- "nr" (non risponde), come lo scrive lo staff.

alter table public.task add column if not exists nota_esito text;

create or replace function public.crm_task_completa(p_task uuid, p_esito text default null, p_nota text default null)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare me uuid := crm.chi();
begin
  if p_esito is not null and p_esito not in ('positivo', 'negativo') then raise exception 'Esito non valido'; end if;
  update public.task
     set completato_il = now(), esito = p_esito, assegnato_a = coalesce(assegnato_a, me),
         nota_esito = nullif(trim(coalesce(p_nota, '')), '')
   where id = p_task and completato_il is null;
  if not found then raise exception 'Task non trovato o gia'' chiuso'; end if;
end;
$$;

-- Il testo di un task per le colonne «Nota task»: fatto -> la nota di chi l'ha
-- fatto (o "nr"), altrimenti la nota con cui e' stato creato.
create or replace function crm.nota_task(t public.task)
returns text
language sql immutable set search_path = ''
as $$
  select case
    when t.completato_il is not null and not t.archiviato then
      coalesce(nullif(trim(t.nota_esito), ''), case when t.esito = 'negativo' then 'nr' end, nullif(trim(t.nota), ''))
    else nullif(trim(t.nota), '')
  end;
$$;

do $$
declare
  def text := pg_get_functiondef('public.crm_lead(text,text,text,int)'::regprocedure);
  nuova text := replace(def,
    E'(select string_agg(t.nota, \', \' order by coalesce(t.data, t.creato_il) desc)\n            from public.task t where t.lead_id = l.id and nullif(trim(t.nota), \'\') is not null)',
    E'(select string_agg(crm.nota_task(t), \', \' order by coalesce(t.completato_il, t.data, t.creato_il) desc)\n            from public.task t where t.lead_id = l.id and crm.nota_task(t) is not null)');
begin
  if nuova = def then raise exception 'crm_lead: testo da sostituire non trovato'; end if;
  execute nuova;
end;
$$;

-- Nella storia della persona il task porta anche la nota di chi l'ha fatto.
do $$
declare
  def text := pg_get_functiondef('public.crm_persona(uuid)'::regprocedure);
  nuova text := replace(def, '''archiviato'', t.archiviato,', '''archiviato'', t.archiviato, ''nota_esito'', t.nota_esito,');
begin
  if nuova = def then raise exception 'crm_persona: testo da sostituire non trovato'; end if;
  execute nuova;
end;
$$;
