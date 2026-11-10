-- Azioni istruttore: la lista di recupero «Formula 8»
--
-- Oltre al benvenuto (20261110a/b), che nasce da solo per ogni nuovo iscritto, serve
-- riprendere TUTTI gli iscritti di prima che hanno un abbonamento vero attivo e non
-- hanno mai prenotato la categoria di lezione scelta (oggi Formula 8), per portarli a
-- provarla. Sono migliaia: si creano in blocco e si smaltiscono un po' alla volta.
--
-- Nelle Azioni istruttore sono un contenitore a parte (tipo `recupero_formula8`): stessa
-- logica del benvenuto (libere da prendere, le mie, di tutti; presa in carico; stessi esiti)
-- ma separate, e contate a parte.
--
--   - nuova automazione `azioni_istruttori_recupero`: le sue regole (abbonamento, piani
--     esclusi, lezioni, categoria) si cambiano da «Impostazioni automazioni», come per il
--     benvenuto. Non ha giorni e data di partenza: guarda tutti gli iscritti PRIMA del giorno
--     di partenza del benvenuto (quelli da allora in poi li segue il benvenuto);
--   - non crea azioni a chi ne ha gia' una (di qualsiasi tipo);
--   - si creano a gruppi (`crm.azioni_recupero_genera`), da Impostazioni automazioni o a
--     mano: tanti insieme non stanno nel tempo concesso a una richiesta dell'app;
--   - la lista delle azioni si puo' cercare per nome, telefono o email, e si sceglie il
--     contenitore (`p_lista`).
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

alter table public.azioni_istruttori drop constraint if exists azioni_istruttori_tipo_check;
alter table public.azioni_istruttori add constraint azioni_istruttori_tipo_check
  check (tipo in ('benvenuto', 'recupero_formula8'));

insert into public.automazioni (chiave, nome, descrizione, attiva, parametri)
select 'azioni_istruttori_recupero', 'Recupero: abbonati che non hanno provato Formula 8',
       'Crea in blocco le azioni per chi era già iscritto prima del benvenuto, ha un abbonamento vero attivo e non ha mai prenotato la categoria scelta.',
       true,
       jsonb_build_object('abbonamento', 'attivo', 'piani_esclusi', b.parametri -> 'piani_esclusi',
                          'lezioni', 'nessuna', 'categoria_lezione', 8)
  from public.automazioni b where b.chiave = 'azioni_istruttori_benvenuto'
on conflict (chiave) do nothing;

-- Chi ha le regole del recupero e non ha ancora nessuna azione, fra gli iscritti prima del benvenuto.
create or replace function crm.azioni_recupero_candidati()
returns table (member_id bigint, iscritto date)
language sql
stable
set search_path = ''
as $$
  select c.member_id, c.iscritto
    from public.automazioni r
    join public.automazioni b on b.chiave = 'azioni_istruttori_benvenuto'
    cross join lateral crm.azioni_istruttori_candidati(
      r.parametri, '2000-01-01'::date,
      coalesce((b.parametri ->> 'iscritti_dal')::date, (now() at time zone 'Europe/Rome')::date) - 1) c
   where r.chiave = 'azioni_istruttori_recupero' and r.attiva
     and not exists (select 1 from public.azioni_istruttori x where x.member_id = c.member_id)
$$;
revoke all on function crm.azioni_recupero_candidati() from public, anon, authenticated;

-- Crea fino a p_max azioni di recupero (le persone senza una scheda nel CRM ne ricevono una).
create or replace function crm.azioni_recupero_genera(p_max int default 500)
returns int
language plpgsql
set search_path = ''
as $$
declare
  n int;
  oggi date := (now() at time zone 'Europe/Rome')::date;
begin
  insert into public.azioni_istruttori (tipo, utente_id, member_id, iscritto_il, da_fare_dal)
  select 'recupero_formula8', crm.persona_del_socio(c.member_id), c.member_id, c.iscritto, oggi
    from (select * from crm.azioni_recupero_candidati() order by iscritto desc, member_id limit greatest(coalesce(p_max, 500), 0)) c
  on conflict (tipo, member_id) do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function crm.azioni_recupero_genera(int) from public, anon, authenticated;

-- Per la pagina Impostazioni automazioni: quante ne restano da creare.
create or replace function public.crm_azioni_recupero_anteprima()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform crm.chi();
  if not crm.puo_vedere('automazioni') then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'da_creare', (select count(*) from crm.azioni_recupero_candidati()),
    'create', (select count(*) from public.azioni_istruttori where tipo = 'recupero_formula8'),
    'aperte', (select count(*) from public.azioni_istruttori where tipo = 'recupero_formula8' and completato_il is null));
end;
$$;

-- Il pulsante «Crea le azioni»: a gruppi di 300.
create or replace function public.crm_azioni_recupero_genera()
returns jsonb
language plpgsql volatile security definer set search_path = ''
as $$
declare n int;
begin
  perform crm.chi();
  if not crm.puo_vedere('automazioni') then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  n := crm.azioni_recupero_genera(300);
  return jsonb_build_object('create', n, 'restano', (select count(*) from crm.azioni_recupero_candidati()));
end;
$$;

-- Le automazioni: le azioni create e aperte sono quelle del suo tipo.
create or replace function public.crm_automazioni()
returns table (chiave text, nome text, descrizione text, attiva boolean, parametri jsonb,
               aggiornato_il timestamptz, aggiornato_da_nome text, azioni_create int, azioni_aperte int)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform crm.chi();
  if not crm.puo_vedere('automazioni') then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  return query
    select a.chiave, a.nome, a.descrizione, a.attiva, a.parametri, a.aggiornato_il, crm.nome_staff(a.aggiornato_da),
           (select count(*)::int from public.azioni_istruttori z
             where z.tipo = case a.chiave when 'azioni_istruttori_recupero' then 'recupero_formula8' else 'benvenuto' end),
           (select count(*)::int from public.azioni_istruttori z
             where z.tipo = case a.chiave when 'azioni_istruttori_recupero' then 'recupero_formula8' else 'benvenuto' end
               and z.completato_il is null)
      from public.automazioni a
     order by case a.chiave when 'azioni_istruttori_benvenuto' then 0 else 1 end, a.nome;
end;
$$;

-- Salvare le regole: il recupero non ha giorni e data di partenza.
create or replace function public.crm_automazione_salva(p_chiave text, p_attiva boolean, p_parametri jsonb)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  me uuid := crm.chi();
  attuali jsonb;
  giorni int;
  dal date;
  abb text := coalesce(p_parametri ->> 'abbonamento', 'attivo');
  lez text := coalesce(p_parametri ->> 'lezioni', 'nessuna');
  cat bigint := nullif(p_parametri ->> 'categoria_lezione', '')::bigint;
  piani jsonb := coalesce(p_parametri -> 'piani_esclusi', '[]'::jsonb);
  nuovi jsonb;
begin
  if not crm.puo_vedere('automazioni') then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  select parametri into attuali from public.automazioni where chiave = p_chiave;
  if attuali is null then
    raise exception 'Automazione inesistente';
  end if;
  if abb not in ('attivo', 'mai', 'nessuno_attivo', 'non_controllare') then raise exception 'Abbonamento non valido'; end if;
  if lez not in ('nessuna', 'almeno_una', 'non_controllare') then raise exception 'Regola sulle lezioni non valida'; end if;
  if cat is not null and not exists (select 1 from perfectgym.class_categories where id = cat) then
    raise exception 'Categoria di lezione inesistente';
  end if;
  if jsonb_typeof(piani) <> 'array' then raise exception 'Elenco dei piani non valido'; end if;
  nuovi := jsonb_build_object('abbonamento', abb, 'piani_esclusi', piani, 'lezioni', lez, 'categoria_lezione', cat);

  if p_chiave = 'azioni_istruttori_benvenuto' then
    begin
      giorni := (p_parametri ->> 'giorni')::int;
    exception when others then
      raise exception 'I giorni devono essere un numero';
    end;
    if giorni is null or giorni < 0 or giorni > 60 then
      raise exception 'I giorni devono essere da 0 a 60';
    end if;
    begin
      dal := (p_parametri ->> 'iscritti_dal')::date;
    exception when others then
      raise exception 'La data di partenza non è valida';
    end;
    if dal is null then raise exception 'Scegli da quale giorno guardare gli iscritti'; end if;
    nuovi := nuovi || jsonb_build_object('giorni', giorni, 'iscritti_dal', dal);
  end if;

  update public.automazioni
     set attiva = coalesce(p_attiva, attiva), parametri = nuovi, aggiornato_il = now(), aggiornato_da = me
   where chiave = p_chiave;
end;
$$;

-- La lista: con il contenitore (benvenuto o recupero) e la ricerca.
drop function if exists public.crm_azioni_istruttori(text, text, int);
create function public.crm_azioni_istruttori(p_chi text default 'mie', p_quando text default 'da_fare',
                                             p_lista text default 'benvenuto', p_testo text default null,
                                             p_limite int default 300)
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
  tipo_lista text := case coalesce(p_lista, 'benvenuto') when 'recupero' then 'recupero_formula8' else 'benvenuto' end;
  parole text[] := array(select w from unnest(string_to_array(lower(trim(coalesce(p_testo, ''))), ' ')) w where w <> '');
begin
  if not crm.puo_vedere('azioni_istruttori') then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  return query
  with b as (
    select a.id as aid, a.tipo as atipo, u.id as uid,
           coalesce(nullif(pm.nome, ''), u.nome) as bnome, coalesce(nullif(pm.cognome, ''), u.cognome) as bcognome,
           coalesce(nullif(pm.telefono, ''), u.telefono) as btel, coalesce(nullif(pm.email, ''), u.email) as bemail,
           a.iscritto_il as aisc, a.da_fare_dal as adal, a.assegnato_a as aass, a.completato_il as acomp,
           a.completato_da as acompda, a.esito as aesito, a.nota as anota, a.creato_il as acreato, a.member_id as amem
      from public.azioni_istruttori a
      join public.utenti u on u.id = a.utente_id and not crm.cancellata(u.member_id)
      left join perfectgym.members pm on pm.id = a.member_id
     where a.tipo = tipo_lista
       and case coalesce(p_chi, 'mie')
             when 'mie' then a.assegnato_a = me
             when 'libere' then a.assegnato_a is null
             else true end
       and case coalesce(p_quando, 'da_fare')
             when 'fatte' then a.completato_il is not null
             else a.completato_il is null and a.da_fare_dal <= oggi end
  )
  select b.aid, b.atipo, b.uid, b.bnome, b.bcognome, b.btel, b.bemail,
         b.aisc, b.adal, greatest(oggi - b.adal, 0)::int,
         b.aass, crm.nome_staff(b.aass), ab.nome, ab.inizio,
         b.acomp, crm.nome_staff(b.acompda), b.aesito, b.anota
    from b
    left join lateral (
      select p.nome, c.data_inizio as inizio
        from perfectgym.contracts c
        join perfectgym.payment_plans p on p.id = c.payment_plan_id
       where c.member_id = b.amem and not c.is_deleted and coalesce(c.attivo, false)
         and not crm.e_pass(p.nome) and p.id <> all (esclusi)
         and not coalesce(p.aggiuntivo, false) and (p.canone > 0 or p.nome ~* '^OLD')
       order by c.data_inizio desc nulls last limit 1) ab on true
   where not exists (
           select 1 from unnest(parole) w
            where lower(concat_ws(' ', b.bnome, b.bcognome, b.btel, b.bemail)) not like '%' || w || '%')
   order by case when p_quando = 'fatte' then b.acomp end desc nulls last,
            case when tipo_lista = 'recupero_formula8' then ab.inizio end desc nulls last,
            b.adal asc, b.acreato asc
   limit least(greatest(coalesce(p_limite, 300), 1), 1000);
end;
$$;

-- I numeri in alto, per contenitore.
create or replace function public.crm_azioni_istruttori_numeri()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  me uuid := crm.chi();
  oggi date := (now() at time zone 'Europe/Rome')::date;
begin
  if not crm.puo_vedere('azioni_istruttori') then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'mie_da_fare', (select count(*) from public.azioni_istruttori where tipo = 'benvenuto' and assegnato_a = me and completato_il is null and da_fare_dal <= oggi),
    'mie_in_ritardo', (select count(*) from public.azioni_istruttori where tipo = 'benvenuto' and assegnato_a = me and completato_il is null and da_fare_dal < oggi),
    'libere', (select count(*) from public.azioni_istruttori where tipo = 'benvenuto' and assegnato_a is null and completato_il is null and da_fare_dal <= oggi),
    'fatte_settimana', (select count(*) from public.azioni_istruttori where tipo = 'benvenuto' and completato_da = me and completato_il >= now() - interval '7 days'),
    'recupero_mie', (select count(*) from public.azioni_istruttori where tipo = 'recupero_formula8' and assegnato_a = me and completato_il is null),
    'recupero_libere', (select count(*) from public.azioni_istruttori where tipo = 'recupero_formula8' and assegnato_a is null and completato_il is null),
    'recupero_fatte_settimana', (select count(*) from public.azioni_istruttori where tipo = 'recupero_formula8' and completato_da = me and completato_il >= now() - interval '7 days'),
    'recupero_fatte_totale', (select count(*) from public.azioni_istruttori where tipo = 'recupero_formula8' and completato_il is not null));
end;
$$;

revoke all on function public.crm_azioni_istruttori(text, text, text, text, int),
                       public.crm_azioni_istruttori_numeri(),
                       public.crm_automazioni(),
                       public.crm_automazione_salva(text, boolean, jsonb),
                       public.crm_azioni_recupero_anteprima(),
                       public.crm_azioni_recupero_genera() from public, anon;
grant execute on function public.crm_azioni_istruttori(text, text, text, text, int),
                          public.crm_azioni_istruttori_numeri(),
                          public.crm_automazioni(),
                          public.crm_automazione_salva(text, boolean, jsonb),
                          public.crm_azioni_recupero_anteprima(),
                          public.crm_azioni_recupero_genera() to authenticated;
