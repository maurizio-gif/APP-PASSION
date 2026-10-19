-- Le anagrafiche cancellate su PerfectGym non si vedono piu' nel CRM
--
-- I form del sito (Prova Passion, Presenta un amico) creavano su PerfectGym un
-- lead nuovo anche quando la persona c'era gia' come lead o guest: ~300 email
-- con piu' anagrafiche (19/10/2026). I doppioni si cancellano su PerfectGym
-- (isDeleted = true, Edge Function perfectgym-doppioni) e il mirror lo vede al
-- giro successivo del sync. Qui il CRM si adegua:
--
-- * `crm.cancellata(member)`: il member e' cancellato su PerfectGym.
-- * `crm.collega_soci()` (dentro `crm.alimenta()`, ogni 5 minuti) riaggancia
--   la persona il cui member e' stato cancellato all'anagrafica rimasta con la
--   stessa email, con le stesse regole di chi non era agganciato: prima la
--   socia, poi la piu' vecchia, mai un member gia' di un'altra persona.
-- * Se non resta nessuna anagrafica, la persona resta agganciata al member
--   cancellato e sparisce da Cerca, Lead, Task e dai numeri della home.
-- * Se la stessa persona torna (una richiesta nuova dal sito, da Meta, dal
--   desk), `crm.persona()` la stacca dal member cancellato: torna visibile, e
--   `crm.collega_soci()` la riaggancia appena ha di nuovo un'anagrafica.
-- * `crm_lead_perfectgym()`, il «Nuovo lead» del desk verso PerfectGym: se la
--   persona non e' agganciata ma su PerfectGym c'e' gia' un'anagrafica non
--   cancellata con la sua email, la usa e non ne crea un'altra.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

create or replace function crm.cancellata(p_member bigint)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select m.is_deleted from perfectgym.members m where m.id = p_member), false);
$$;

create or replace function crm.persona_cancellata(p_utente uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select crm.cancellata(u.member_id) from public.utenti u where u.id = p_utente), false);
$$;

revoke all on function crm.cancellata(bigint) from public, anon, authenticated;
revoke all on function crm.persona_cancellata(uuid) from public, anon, authenticated;

create or replace function crm.collega_soci()
returns integer
language plpgsql
set search_path = ''
as $$
declare n int;
begin
  with scelti as (
    select distinct on (u.id) u.id as utente, m.id as member
      from public.utenti u
      join perfectgym.members m on not m.is_deleted and public.normalizza_email(m.email) = u.email_norm
     where (u.member_id is null or crm.cancellata(u.member_id)) and u.email_norm is not null
     order by u.id, (m.member_type = 'Member') desc, m.id
  ),
  unici as (
    select distinct on (s.member) s.utente, s.member
      from scelti s
     where not exists (select 1 from public.utenti o where o.member_id = s.member)
     order by s.member, s.utente
  )
  update public.utenti u set member_id = x.member, aggiornato_il = now()
    from unici x
   where x.utente = u.id;
  get diagnostics n = row_count;
  return n;
end;
$$;

create or replace function crm.persona(p_nome text, p_cognome text, p_email text, p_telefono text, p_member_id bigint default null)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  u uuid;
  e text := public.normalizza_email(p_email);
  t text := public.normalizza_telefono(p_telefono);
begin
  if p_member_id is not null then
    select id into u from public.utenti where member_id = p_member_id order by creato_il limit 1;
  end if;
  if u is null and e is not null then
    select id into u from public.utenti where email_norm = e order by (member_id is not null) desc, creato_il limit 1;
  end if;
  if u is null and t is not null then
    select id into u from public.utenti where telefono_norm = t order by (member_id is not null) desc, creato_il limit 1;
  end if;

  if u is null then
    insert into public.utenti (nome, cognome, email, telefono, member_id)
    values (nullif(trim(p_nome), ''), nullif(trim(p_cognome), ''), nullif(trim(p_email), ''), nullif(trim(p_telefono), ''), p_member_id)
    returning id into u;
  else
    -- Agganciata a un member cancellato: la richiesta nuova la riporta in vista.
    update public.utenti
       set member_id = case when crm.cancellata(member_id) then p_member_id else coalesce(member_id, p_member_id) end,
           email = coalesce(email, nullif(trim(p_email), '')),
           telefono = coalesce(telefono, nullif(trim(p_telefono), '')),
           nome = coalesce(nome, nullif(trim(p_nome), '')),
           cognome = coalesce(cognome, nullif(trim(p_cognome), '')),
           aggiornato_il = now()
     where id = u;
  end if;
  return u;
end;
$$;

create or replace function public.crm_lead_perfectgym(p_lead uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := crm.chi();
  r jsonb;
begin
  select jsonb_build_object('nome', u.nome, 'cognome', u.cognome, 'email', u.email, 'telefono', u.telefono,
                            'member_id', case when u.member_id is not null and not crm.cancellata(u.member_id) then u.member_id
                                              else (select m.id from perfectgym.members m
                                                     where not m.is_deleted and u.email_norm is not null
                                                       and public.normalizza_email(m.email) = u.email_norm
                                                     order by (m.member_type = 'Member') desc, m.id limit 1) end,
                            'pgm_stato', l.pgm_stato, 'consenso_privacy', l.consenso_privacy)
    into r
    from public.lead l join public.utenti u on u.id = l.utente_id
   where l.id = p_lead and l.origine = 'app';
  if r is null then raise exception 'Lead non trovato o non creato dal CRM'; end if;
  if r->>'pgm_stato' in ('creato', 'gia_su_pgm') then raise exception 'Lead già su PerfectGym'; end if;
  return r;
end;
$$;

-- Cerca, Lead, Task e la home: senza le persone cancellate su PerfectGym.
do $$
declare
  f regprocedure;
  def text;
  coppie text[][] := array[
    ['public.crm_cerca(text,integer)',
     E'    from public.utenti u\n',
     E'    from public.utenti u\n    join lateral (select not crm.cancellata(u.member_id) as visibile) vis on vis.visibile\n'],
    ['public.crm_lead(text,text,text,integer,uuid)',
     'join public.utenti u on u.id = l.utente_id',
     'join public.utenti u on u.id = l.utente_id and not crm.cancellata(u.member_id)'],
    ['public.crm_task(text,text,integer,uuid)',
     'join public.utenti u on u.id = t.utente_id',
     'join public.utenti u on u.id = t.utente_id and not crm.cancellata(u.member_id)'],
    ['public.crm_home()',
     'from public.lead where ',
     'from public.lead where not crm.persona_cancellata(utente_id) and '],
    ['public.crm_home()',
     'from public.task where ',
     'from public.task where not crm.persona_cancellata(utente_id) and ']
  ];
  attese int[] := array[1, 1, 1, 3, 3];
  i int;
  trovate int;
begin
  for i in 1 .. array_length(coppie, 1) loop
    f := coppie[i][1]::regprocedure;
    def := pg_get_functiondef(f);
    trovate := (length(def) - length(replace(def, coppie[i][2], ''))) / length(coppie[i][2]);
    if trovate <> attese[i] then
      raise exception '%: «%» trovato % volte invece di %', f, coppie[i][2], trovate, attese[i];
    end if;
    execute replace(def, coppie[i][2], coppie[i][3]);
  end loop;
end;
$$;

select crm.collega_soci();
