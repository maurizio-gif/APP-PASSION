-- Le prove si chiudono da sole: iscritto e non iscritto li dice PerfectGym
--
-- Come per i lead vinti (20260928o), l'esito di una prova non si segna piu' a
-- mano. Lo fa `crm.prove_esiti_dal_mirror()`, dentro `crm.alimenta()` ogni 5
-- minuti:
--
--   iscritto      su PerfectGym c'e' un abbonamento principale (non un pass,
--                 non aggiuntivo, a pagamento o dei piani OLD) firmato fra
--                 l'inizio della prova e 30 giorni dopo la fine del pass, la
--                 stessa finestra della dashboard abbonamenti (20260928r).
--                 Vale anche per una prova gia' chiusa come non iscritto: se
--                 poi si abbona nella finestra, diventa iscritto. Resta
--                 l'abbonamento che l'ha chiusa (`esito_contract_id`);
--   non iscritto  sono passati 30 giorni dalla fine del pass e l'abbonamento
--                 non c'e'. Fino ad allora la prova resta fra le «Finite senza
--                 esito», per richiamare la persona; a mano si puo' chiudere
--                 prima come non iscritto.
--
-- Il pass che non ha la data di fine (le prove arrivate dai moduli, senza il
-- Pass su PerfectGym) dura 7 giorni, come il Guest Pass. `esito_automatico_il`
-- dice quando l'esito l'ha messo il mirror: una prova chiusa da sola come non
-- iscritto e poi riaperta non si richiude, una iscritta si' (l'abbonamento e'
-- li'). A mano «Iscritto» non si sceglie piu': lo si tiene solo se c'era gia'.
-- Il 29/09/2026, alla prima passata: 31 prove aperte si chiudono come
-- iscritto e 226 come non iscritto (tutte vecchie, da Airtable), e 3 non
-- iscritto diventano iscritto (si erano abbonate nella finestra).
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

alter table public.prove add column if not exists esito_contract_id bigint;
alter table public.prove add column if not exists esito_automatico_il timestamptz;

create or replace function crm.prove_esiti_dal_mirror()
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  oggi date := (now() at time zone 'Europe/Rome')::date;
  club bigint := (select valore::bigint from crm.impostazioni where chiave = 'club_id');
  iscritti int;
  non_iscritti int;
begin
  -- Iscritto: il primo abbonamento principale firmato nella finestra.
  with aperte as (
    select p.id, u.member_id,
           (p.data_inizio at time zone 'Europe/Rome')::date as inizio,
           coalesce((p.data_fine at time zone 'Europe/Rome')::date,
                    (p.data_inizio at time zone 'Europe/Rome')::date + 7) as fine
      from public.prove p
      join public.utenti u on u.id = p.utente_id and u.member_id is not null
     where p.esito is distinct from 'iscritto' and p.data_inizio is not null
  ),
  abbonati as (
    select distinct on (a.id) a.id, c.id as contract_id
      from aperte a
      join perfectgym.contracts c on c.member_id = a.member_id and not c.is_deleted and c.club_id = club
      join perfectgym.payment_plans pp on pp.id = c.payment_plan_id
     where not crm.e_pass(pp.nome) and not coalesce(pp.aggiuntivo, false) and (pp.canone > 0 or pp.nome ~* '^OLD')
       and coalesce(c.data_firma, c.data_inizio) between a.inizio and a.fine + 30
     order by a.id, coalesce(c.data_firma, c.data_inizio), c.id
  )
  update public.prove p
     set esito = 'iscritto', esito_contract_id = b.contract_id, esito_automatico_il = now()
    from abbonati b
   where b.id = p.id;
  get diagnostics iscritti = row_count;

  -- Non iscritto: 30 giorni dopo la fine del pass, senza abbonamento (chi si e'
  -- abbonato e' gia' iscritto qui sopra).
  update public.prove p
     set esito = 'non_iscritto', esito_automatico_il = now()
   where p.esito is null and p.esito_automatico_il is null and p.data_inizio is not null
     and coalesce((p.data_fine at time zone 'Europe/Rome')::date,
                  (p.data_inizio at time zone 'Europe/Rome')::date + 7) + 30 < oggi;
  get diagnostics non_iscritti = row_count;

  return jsonb_build_object('iscritti', iscritti, 'non_iscritti', non_iscritti);
end;
$$;

revoke all on function crm.prove_esiti_dal_mirror() from public, anon, authenticated;

do $$
declare
  def text;
  nuova text;
  vecchio text;
begin
  -- Ogni 5 minuti, dopo i lead vinti.
  def := pg_get_functiondef('crm.alimenta()'::regprocedure);
  vecchio := $a$'lead_vinti', crm.lead_vinti_dal_mirror(),$a$;
  if (length(def) - length(replace(def, vecchio, ''))) / length(vecchio) <> 1 then
    raise exception 'crm.alimenta: lead_vinti non trovato una volta sola';
  end if;
  execute replace(def, vecchio, vecchio || $b$
    'prove_esiti', crm.prove_esiti_dal_mirror(),$b$);

  -- A mano: «Iscritto» no (lo si tiene se c'era gia'), «Non iscritto» si'. Un
  -- esito cambiato a mano non e' piu' del mirror; la riapertura tiene il segno,
  -- cosi' il mirror non richiude come non iscritto una prova riaperta.
  def := pg_get_functiondef('public.crm_prova_aggiorna(uuid,text,text,text,boolean,uuid)'::regprocedure);
  nuova := def;
  vecchio := $a$  if p_esito is not null and p_esito not in ('iscritto', 'non_iscritto', '') then raise exception 'Esito non valido'; end if;
$a$;
  nuova := replace(nuova, vecchio, vecchio || $b$  if p_esito = 'iscritto' and (select esito from public.prove where id = p_prova) is distinct from 'iscritto' then
    raise exception 'Iscritto si segna da solo, quando su PerfectGym compare l''abbonamento';
  end if;
$b$);
  if nuova = def then raise exception 'crm_prova_aggiorna: controllo esito non trovato'; end if;
  def := nuova;
  vecchio := $a$     set esito = nullif(p_esito, ''),
$a$;
  nuova := replace(nuova, vecchio, vecchio || $b$         esito_contract_id = case when nullif(p_esito, '') is distinct from esito then null else esito_contract_id end,
         esito_automatico_il = case when nullif(p_esito, '') is not null and nullif(p_esito, '') is distinct from esito then null
                                    else esito_automatico_il end,
$b$);
  if nuova = def then raise exception 'crm_prova_aggiorna: set esito non trovato'; end if;
  execute nuova;

  -- Nella scheda persona: se l'esito l'ha messo il mirror, e con che abbonamento.
  def := pg_get_functiondef('public.crm_persona(uuid)'::regprocedure);
  vecchio := $a$'gestito_da', p.gestito_da, 'note', p.note)$a$;
  if (length(def) - length(replace(def, vecchio, ''))) / length(vecchio) <> 1 then
    raise exception 'crm_persona: prove non trovate una volta sola';
  end if;
  execute replace(def, vecchio, $b$'gestito_da', p.gestito_da, 'note', p.note,
        'automatico', p.esito is not null and p.esito_automatico_il is not null,
        'abbonamento', (select jsonb_build_object('piano', pp.nome, 'dal', coalesce(k.data_firma, k.data_inizio))
                          from perfectgym.contracts k join perfectgym.payment_plans pp on pp.id = k.payment_plan_id
                         where k.id = p.esito_contract_id))$b$);
end;
$$;
