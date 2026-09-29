-- «Nuovo lead»: la casella del consenso privacy
--
-- Il lead creato nel CRM andava su PerfectGym con l'agreement 3 sempre
-- accettato (20260929o). Ora il consenso lo spunta chi crea il lead, come la
-- persona fa nel form del sito:
--   - `lead.consenso_privacy`: si' / no (vuoto per i lead che non passano dal
--     modulo del CRM);
--   - `crm_lead_nuovo(..., p_privacy)`: lo salva;
--   - `crm_lead_perfectgym()` lo da' all'Edge Function, che lo manda come
--     `hasAgreed` dell'agreement 3;
--   - `crm_persona()` lo restituisce per ogni lead.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

alter table public.lead add column if not exists consenso_privacy boolean;

do $$
declare
  def text;
  nuova text;
begin
  -- crm_lead_nuovo: il parametro in fondo e la colonna nell'insert.
  def := pg_get_functiondef('public.crm_lead_nuovo(text,text,text,text,text,text,text,text,boolean)'::regprocedure);
  nuova := replace(def, 'p_prendo boolean DEFAULT true)', 'p_prendo boolean DEFAULT true, p_privacy boolean DEFAULT NULL::boolean)');
  if nuova = def then raise exception 'crm_lead_nuovo: firma non trovata'; end if;
  def := nuova;
  nuova := replace(def, 'fase, assegnato_a, preso_in_carico_il, origine)',
                        'fase, assegnato_a, preso_in_carico_il, origine, consenso_privacy)');
  if nuova = def then raise exception 'crm_lead_nuovo: colonne non trovate'; end if;
  def := nuova;
  nuova := replace(def, $a$case when p_prendo then now() end, 'app')$a$,
                        $b$case when p_prendo then now() end, 'app', p_privacy)$b$);
  if nuova = def then raise exception 'crm_lead_nuovo: valori non trovati'; end if;
  drop function public.crm_lead_nuovo(text, text, text, text, text, text, text, text, boolean);
  execute nuova;
  revoke all on function public.crm_lead_nuovo(text, text, text, text, text, text, text, text, boolean, boolean) from public, anon;
  grant execute on function public.crm_lead_nuovo(text, text, text, text, text, text, text, text, boolean, boolean) to authenticated;

  -- crm_lead_perfectgym: anche il consenso.
  def := pg_get_functiondef('public.crm_lead_perfectgym(uuid)'::regprocedure);
  nuova := replace(def, $a$'member_id', u.member_id, 'pgm_stato', l.pgm_stato)$a$,
                        $b$'member_id', u.member_id, 'pgm_stato', l.pgm_stato, 'consenso_privacy', l.consenso_privacy)$b$);
  if nuova = def then raise exception 'crm_lead_perfectgym: dati non trovati'; end if;
  execute nuova;

  -- crm_persona: il consenso di ogni lead.
  def := pg_get_functiondef('public.crm_persona(uuid)'::regprocedure);
  nuova := replace(def, $a$'pgm_errore', l.pgm_errore) order by l.creato_il desc)$a$,
                        $b$'pgm_errore', l.pgm_errore, 'consenso_privacy', l.consenso_privacy) order by l.creato_il desc)$b$);
  if nuova = def then raise exception 'crm_persona: lead non trovati'; end if;
  execute nuova;
end;
$$;
