-- Azioni istruttore: solo chi ha un abbonamento vero attivo
--
-- Correzione di 20261110a. L'azione «benvenuto» e' per i NUOVI iscritti che hanno gia' un
-- abbonamento vero ATTIVO e non hanno ancora prenotato la categoria di lezione scelta
-- (oggi Formula 8): l'istruttore li contatta per farli provare. Prima prendeva chi non
-- aveva MAI un abbonamento (pass, prove e iscritti senza contratto), che e' l'opposto.
--
--   - regola `abbonamento`: nuovo valore «attivo» = ha un abbonamento vero attivo adesso
--     (contratto non cancellato, attivo, gia' partito, non pass/prova/Guest Pass, non
--     aggiuntivo, con un canone, e il cui piano non e' fra i `piani_esclusi`: Wellhub,
--     Gympass, Fitprime e simili non contano). E' il nuovo valore di partenza;
--   - le azioni libere nate con la regola sbagliata si tolgono (nessuna era stata presa o
--     chiusa) e il generatore le rifa' con la regola giusta;
--   - la lista dice quale abbonamento ha la persona e da quando, al posto del pass.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

-- Chi rispetta le regole: ora anche «attivo».
create or replace function crm.azioni_istruttori_candidati(p jsonb, p_dal date, p_al date)
returns table (member_id bigint, iscritto date)
language sql
stable
set search_path = ''
as $$
  with r as (
    select coalesce(p ->> 'abbonamento', 'attivo') as abb,
           coalesce(p ->> 'lezioni', 'nessuna') as lez,
           nullif(p ->> 'categoria_lezione', '')::bigint as cat,
           coalesce((select array_agg(t.v::bigint) from jsonb_array_elements_text(coalesce(p -> 'piani_esclusi', '[]'::jsonb)) as t(v)),
                    '{}'::bigint[]) as esclusi,
           (now() at time zone 'Europe/Rome')::date as oggi
  )
  select m.id, i.giorno
    from perfectgym.members m
    cross join r
    cross join lateral (select (m.creato_il at time zone 'Europe/Rome')::date as giorno) i
   where not m.is_deleted
     and not crm.cancellata(m.id)
     and i.giorno between p_dal and p_al
     and case r.abb
           when 'attivo' then exists (
             select 1 from perfectgym.contracts c
               join perfectgym.payment_plans pp on pp.id = c.payment_plan_id
              where c.member_id = m.id and not c.is_deleted and coalesce(c.attivo, false)
                and (c.data_inizio is null or c.data_inizio <= r.oggi)
                and not crm.e_pass(pp.nome) and pp.id <> all (r.esclusi)
                and not coalesce(pp.aggiuntivo, false) and (pp.canone > 0 or pp.nome ~* '^OLD'))
           when 'mai' then not exists (
             select 1 from perfectgym.contracts c
               join perfectgym.payment_plans pp on pp.id = c.payment_plan_id
              where c.member_id = m.id and not c.is_deleted
                and not crm.e_pass(pp.nome) and pp.id <> all (r.esclusi)
                and not coalesce(pp.aggiuntivo, false) and (pp.canone > 0 or pp.nome ~* '^OLD'))
           when 'nessuno_attivo' then not exists (
             select 1 from perfectgym.contracts c
               join perfectgym.payment_plans pp on pp.id = c.payment_plan_id
              where c.member_id = m.id and not c.is_deleted and coalesce(c.attivo, false)
                and (c.data_inizio is null or c.data_inizio <= r.oggi)
                and not crm.e_pass(pp.nome) and pp.id <> all (r.esclusi)
                and not coalesce(pp.aggiuntivo, false) and (pp.canone > 0 or pp.nome ~* '^OLD'))
           else true end
     and case when r.cat is null then true
              else case r.lez
                when 'nessuna' then not exists (
                  select 1 from perfectgym.class_bookings b
                    join perfectgym.classes k on k.id = b.class_id
                    join perfectgym.class_types t on t.id = k.class_type_id
                   where b.member_id = m.id and not b.is_deleted
                     and not coalesce(b.annullata, false) and not coalesce(b.in_attesa, false)
                     and t.category_id = r.cat)
                when 'almeno_una' then exists (
                  select 1 from perfectgym.class_bookings b
                    join perfectgym.classes k on k.id = b.class_id
                    join perfectgym.class_types t on t.id = k.class_type_id
                   where b.member_id = m.id and not b.is_deleted
                     and not coalesce(b.annullata, false) and not coalesce(b.in_attesa, false)
                     and t.category_id = r.cat)
                else true end end
$$;
revoke all on function crm.azioni_istruttori_candidati(jsonb, date, date) from public, anon, authenticated;

-- Il salvataggio accetta «attivo» (e parte da li' se manca).
do $mig$
declare
  def text := pg_get_functiondef('public.crm_automazione_salva(text, boolean, jsonb)'::regprocedure);
  nuova text := def;
  prima text;
begin
  prima := nuova;
  nuova := replace(nuova, $a$abb not in ('mai', 'nessuno_attivo', 'non_controllare')$a$, $b$abb not in ('attivo', 'mai', 'nessuno_attivo', 'non_controllare')$b$);
  if nuova = prima then raise exception 'crm_automazione_salva: controllo abbonamento non trovato'; end if;
  prima := nuova;
  nuova := replace(nuova, $a$coalesce(p_parametri ->> 'abbonamento', 'mai')$a$, $b$coalesce(p_parametri ->> 'abbonamento', 'attivo')$b$);
  if nuova = prima then raise exception 'crm_automazione_salva: valore di partenza non trovato'; end if;
  execute nuova;
end;
$mig$;

-- La regola di partenza dell'automazione: abbonamento vero attivo.
update public.automazioni
   set parametri = jsonb_set(parametri, '{abbonamento}', '"attivo"'), aggiornato_il = now()
 where chiave = 'azioni_istruttori_benvenuto';

-- Le azioni libere nate con la regola sbagliata (mai abbonati): si tolgono, il generatore le rifa'.
delete from public.azioni_istruttori
 where tipo = 'benvenuto' and assegnato_a is null and completato_il is null;

-- La lista: l'abbonamento della persona (e da quando) al posto del pass.
drop function if exists public.crm_azioni_istruttori(text, text, int);
create function public.crm_azioni_istruttori(p_chi text default 'mie', p_quando text default 'da_fare', p_limite int default 300)
returns table (id uuid, tipo text, utente_id uuid, nome text, cognome text, telefono text, email text,
               iscritto_il date, da_fare_dal date, giorni_ritardo int,
               assegnato_a uuid, assegnato_nome text, piano_nome text, piano_inizio date,
               completato_il timestamptz, completato_da_nome text, esito text, nota text)
language plpgsql stable security definer set search_path = ''
as $$
declare
  me uuid := crm.chi();
  oggi date := (now() at time zone 'Europe/Rome')::date;
  esclusi bigint[] := coalesce((select array_agg(t.v::bigint)
                                  from public.automazioni a, jsonb_array_elements_text(coalesce(a.parametri -> 'piani_esclusi', '[]'::jsonb)) as t(v)
                                 where a.chiave = 'azioni_istruttori_benvenuto'), '{}'::bigint[]);
begin
  if not crm.puo_vedere('azioni_istruttori') then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  return query
  select a.id, a.tipo, u.id,
         coalesce(nullif(pm.nome, ''), u.nome), coalesce(nullif(pm.cognome, ''), u.cognome),
         coalesce(nullif(pm.telefono, ''), u.telefono), coalesce(nullif(pm.email, ''), u.email),
         a.iscritto_il, a.da_fare_dal, greatest(oggi - a.da_fare_dal, 0)::int,
         a.assegnato_a, crm.nome_staff(a.assegnato_a), ab.nome, ab.inizio,
         a.completato_il, crm.nome_staff(a.completato_da), a.esito, a.nota
    from public.azioni_istruttori a
    join public.utenti u on u.id = a.utente_id and not crm.cancellata(u.member_id)
    left join perfectgym.members pm on pm.id = a.member_id
    left join lateral (
      select p.nome, c.data_inizio as inizio
        from perfectgym.contracts c
        join perfectgym.payment_plans p on p.id = c.payment_plan_id
       where c.member_id = a.member_id and not c.is_deleted and coalesce(c.attivo, false)
         and not crm.e_pass(p.nome) and p.id <> all (esclusi)
         and not coalesce(p.aggiuntivo, false) and (p.canone > 0 or p.nome ~* '^OLD')
       order by c.data_inizio desc nulls last limit 1) ab on true
   where case coalesce(p_chi, 'mie')
           when 'mie' then a.assegnato_a = me
           when 'libere' then a.assegnato_a is null
           else true end
     and case coalesce(p_quando, 'da_fare')
           when 'fatte' then a.completato_il is not null
           else a.completato_il is null and a.da_fare_dal <= oggi end
   order by case when p_quando = 'fatte' then a.completato_il end desc nulls last, a.da_fare_dal asc, a.creato_il asc
   limit least(greatest(coalesce(p_limite, 300), 1), 1000);
end;
$$;
revoke all on function public.crm_azioni_istruttori(text, text, int) from public, anon;
grant execute on function public.crm_azioni_istruttori(text, text, int) to authenticated;
