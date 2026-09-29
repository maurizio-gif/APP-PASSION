-- Il lead creato nel CRM nasce anche su PerfectGym
--
-- «Nuovo lead» (il tour, la telefonata in ingresso) scriveva solo nel CRM. Ora,
-- appena creato, l'Edge Function `crm-perfectgym-lead` lo manda a PerfectGym con
-- la stessa chiamata dei workflow n8n del sito (passion-prova-compilata,
-- passion-referral): Crm2/AddLead, club 1, sourceId 12, campaignId 12,
-- inquiredViaId 79, agreement 3.
--
--   - `lead.pgm_stato`: 'creato' (c'e' `pgm_lead_id`), 'gia_su_pgm' (la persona
--     e' gia' su PerfectGym: niente doppione), 'errore' (il motivo in
--     `pgm_errore`, e dalla scheda persona si riprova);
--   - `crm_lead_perfectgym(p_lead)`: i dati da mandare, per chi e' nel CRM e solo
--     per i lead nati nel CRM (origine 'app') non ancora creati. L'Edge Function
--     la chiama con la sessione di chi usa il CRM; l'esito lo scrive lei, con la
--     chiave di servizio;
--   - `crm_persona()` restituisce i tre campi per ogni lead.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

alter table public.lead
  add column if not exists pgm_stato text check (pgm_stato in ('creato', 'gia_su_pgm', 'errore')),
  add column if not exists pgm_lead_id bigint,
  add column if not exists pgm_errore text,
  add column if not exists pgm_inviato_il timestamptz;

create or replace function public.crm_lead_perfectgym(p_lead uuid)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  me uuid := crm.chi();
  r jsonb;
begin
  select jsonb_build_object('nome', u.nome, 'cognome', u.cognome, 'email', u.email, 'telefono', u.telefono,
                            'member_id', u.member_id, 'pgm_stato', l.pgm_stato)
    into r
    from public.lead l join public.utenti u on u.id = l.utente_id
   where l.id = p_lead and l.origine = 'app';
  if r is null then raise exception 'Lead non trovato o non creato dal CRM'; end if;
  if r->>'pgm_stato' in ('creato', 'gia_su_pgm') then raise exception 'Lead già su PerfectGym'; end if;
  return r;
end;
$$;

revoke all on function public.crm_lead_perfectgym(uuid) from public, anon;
grant execute on function public.crm_lead_perfectgym(uuid) to authenticated;

do $$
declare
  def text;
  nuova text;
begin
  def := pg_get_functiondef('public.crm_persona(uuid)'::regprocedure);
  nuova := replace(def, $a$'orario_ricontatto', l.orario_ricontatto) order by l.creato_il desc)$a$,
                        $b$'orario_ricontatto', l.orario_ricontatto, 'origine', l.origine, 'pgm_stato', l.pgm_stato,
        'pgm_lead_id', l.pgm_lead_id, 'pgm_errore', l.pgm_errore) order by l.creato_il desc)$b$);
  if nuova = def then raise exception 'crm_persona: lead non trovati'; end if;
  execute nuova;
end;
$$;
