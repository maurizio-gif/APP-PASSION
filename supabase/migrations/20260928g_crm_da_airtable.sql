-- Il CRM si costruisce dalla copia di Airtable
--
-- `airtable.ricostruisci_crm()` legge `airtable.record` (la copia grezza della
-- base CRM PASSION FITNESS, 20260928e) e riempie le tabelle del CRM
-- (20260928f). E' una ricostruzione: svuota il CRM e lo rifa' da capo, cosi' una
-- regola corretta qui si applica a tutto rilanciandola. Vale **solo prima di
-- andare dal vivo**: se nel CRM c'e' anche una sola riga nata nel CRM (senza
-- `airtable_id`) la funzione si rifiuta.
--
-- Le regole, una per contenitore:
--
-- Persone (`utenti`). Tutti i record con un nome - opportunita' di ogni tipo,
-- nuovi contratti, pass, disdette - diventano una persona sola quando hanno la
-- stessa email; chi non ha email si aggancia per telefono (normalizzato:
-- "(333) 123-4567" e "+39 333 1234567" sono lo stesso numero) a una persona
-- che quel telefono ce l'ha, altrimenti fa persona a se'. Il socio di
-- PerfectGym (`member_id`, club Passion Fitness) si trova dal numero socio dei
-- nuovi contratti, poi dall'email, poi dal telefono.
--
-- Lead. Le opportunita' Lead, Referral e Tour, senza i record di prova («mau
-- test», i bottoni Btn_Test). La fonte, che su Airtable ha una sessantina di
-- scritture, diventa una di cinque:
--   tour      tipologia Tour (i walk-in)
--   referral  tipologia Referral
--   meta      «Meta Ads», «fb | paid»
--   sito      «SitoWeb | Btn_...», «Btn_... SitoWeb», floating button, ply, chatgpt
--   altro     telefonata in ingresso, WhatsApp, email, social, vuota
-- e il bottone del sito o la campagna Meta restano in `fonte_dettaglio`.
-- Stato: Nuova -> da_gestire (o in_gestione se assegnata), Vinta -> vinta
-- (esito prova se la prova e' stata attivata), Persa -> persa, Doppione ->
-- persa con `doppione_di` sul primo lead della stessa persona.
--
-- Chi arriva dal sito non passa da una richiesta: il modulo attiva subito il
-- pass, e su Airtable l'opportunita' nasce gia' di tipo Pass (1.300 su 1.363,
-- con la fonte «SitoWeb | Btn_...»). E' il flusso della riunione - lead,
-- vinta, prova - compresso in un record: ne nascono un lead, gia' vinto con
-- esito prova, e la prova agganciata a quel lead. Cosi' le fonti contano tutti
-- e il contenitore delle prove resta quello.
--
-- Prove. Le opportunita' Pass (senza i doppioni) e la vecchia tabella PASS;
-- Vinta -> iscritto, Persa -> non iscritto. Il pass su PerfectGym si trova
-- nel mirror: un contratto di quella persona con «pass», «prova» o «guest» nel
-- piano, iniziato entro tre giorni dalla prova.
--
-- Nuovi contratti. La tabella NUOVI CONTRATTI. Il 45% dei record non ha il
-- ContractID: lo si trova nel mirror dal numero socio (User Number) e dal
-- giorno d'acquisto (a Roma: su Airtable la mezzanotte e' salvata come le 22
-- UTC del giorno prima). I controlli: CONTROLLATO, Tesserato, Numero
-- Tessera, ERRORE ASI.
--
-- Disdette. Le opportunita' Disdetta (senza i doppioni) e la vecchia tabella
-- DISDETTE PGM, dove le date sono voci di menu ("31/01/2025 23:59:59") e i
-- motivi sono scritti a mano: si riconducono a un elenco corto.
--
-- Commenti e task. Tutti, agganciati alla persona dell'opportunita' (e al lead,
-- se l'opportunita' e' un lead). L'autore e' l'account Airtable, che porta
-- l'email: si riconosce nello staff.
--
-- Rinnovi e Customer Care restano fuori dai contenitori (scelta del
-- 28/09/2026), ma le loro persone, i commenti e i task entrano.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

-- Chi ha lavorato su Airtable e non c'e' piu' (due ex consulenti, con
-- migliaia di task e commenti) va inserito a mano in `public.staff` con
-- `attivo = false`, come il resto dello staff (vedi 20260928f): i dati
-- personali non stanno nel repository, che e' pubblico. Senza, la sua storia
-- entra comunque, con il nome in `autore_nome`.

-- ---------------------------------------------------------------------------
-- Piccoli attrezzi
-- ---------------------------------------------------------------------------

create or replace function airtable.ts(p text)
returns timestamptz language sql immutable as $$
  select case when p ~ '^\d{4}-\d{2}-\d{2}' then p::timestamptz end
$$;

-- Il giorno a Roma di un istante di Airtable.
create or replace function airtable.giorno(p text)
returns date language sql stable as $$
  select (airtable.ts(p) at time zone 'Europe/Rome')::date
$$;

-- "31/01/2025", "31/3/2025", "19/11/2024 10:00:41" -> data.
create or replace function airtable.data_it(p text)
returns date language sql immutable as $$
  select case when p ~ '^\s*\d{1,2}/\d{1,2}/\d{4}'
              then make_date(split_part(split_part(trim(p), ' ', 1), '/', 3)::int,
                             split_part(trim(p), '/', 2)::int,
                             split_part(trim(p), '/', 1)::int) end
$$;

create or replace function airtable.testo(p text)
returns text language sql immutable as $$ select nullif(trim(coalesce(p, '')), '') $$;

-- I motivi di disdetta scritti a mano, ricondotti.
create or replace function airtable.motivo_disdetta(p text)
returns text language sql immutable as $$
  select case
    when p is null or trim(p) = '' or lower(trim(p)) in ('nr', '-') then null
    when p ~* 'cambio\s*o?c?ontratto|upgrade' then 'Cambio contratto'
    when p ~* 'trasfer|transfer|quartiere|citt' then 'Trasferimento'
    when p ~* 'malatt|infortun' then 'Malattia/Infortunio'
    when p ~* 'tempo|non riesc|non puo|corsi il pom' then 'Mancanza di tempo'
    when p ~* 'caro' then 'Prezzo'
    when p ~* 'motivaz' then 'Mancanza di motivazione'
    when p ~* 'fine contratto|contractrenewal|fine promozione|solo un mese|solo quest' then 'Fine contratto'
    when p ~* 'attivit|kick|box|crossfit|crosfit' then 'Attivita'' mancante'
    when p ~* 'qualit' then 'Qualita'' delle lezioni'
    when p ~* 'management|managment|chiuso dal' then 'Chiuso dal management'
    when p ~* 'cessione|sorella' then 'Cessione del contratto'
    when p ~* 'morte' then 'Decesso'
    when p ~* 'numero staccato' then 'Non raggiungibile'
    when p ~* 'quarterly' then 'Disdetta trimestrale'
    else 'Altro'
  end
$$;

-- ---------------------------------------------------------------------------
-- La ricostruzione
-- ---------------------------------------------------------------------------

create or replace function airtable.ricostruisci_crm()
returns jsonb
language plpgsql
set search_path = public, airtable, pg_temp
as $$
declare
  nati_nel_crm int;
  esito jsonb;
begin
  select (select count(*) from public.lead where airtable_id is null)
       + (select count(*) from public.prove where airtable_id is null)
       + (select count(*) from public.nuovi_contratti where airtable_id is null)
       + (select count(*) from public.disdette where airtable_id is null)
       + (select count(*) from public.commenti where airtable_id is null)
       + (select count(*) from public.task where airtable_id is null)
    into nati_nel_crm;
  if nati_nel_crm > 0 then
    raise exception 'Nel CRM ci sono % righe nate nel CRM: la ricostruzione da Airtable le cancellerebbe', nati_nel_crm;
  end if;

  truncate public.task, public.commenti, public.disdette, public.nuovi_contratti,
           public.prove, public.lead, public.utenti;

  -- -------------------------------------------------------------------------
  -- Lo staff visto da Airtable: per email, per record Commerciali, per nome
  -- -------------------------------------------------------------------------
  create temp table st_commerciale on commit drop as
    select c.id as rec, s.id as staff_id
      from airtable.record c
      join public.staff s on s.airtable_nome = upper(trim(c.dati ->> 'Nome Commerciale'))
     where c.tabella = 'Commerciali';

  -- -------------------------------------------------------------------------
  -- Le persone
  -- -------------------------------------------------------------------------
  create temp table cand on commit drop as
  select r.tabella, r.id as rec,
         airtable.testo(x.nome) as nome, airtable.testo(x.cognome) as cognome,
         airtable.testo(x.email) as email, public.normalizza_email(x.email) as email_norm,
         airtable.testo(x.telefono) as telefono, public.normalizza_telefono(x.telefono) as tel_norm,
         airtable.testo(x.cf) as cf,
         x.numero_socio,
         coalesce(x.quando, r.creato_il) as quando
    from airtable.record r
    cross join lateral (
      select case r.tabella when 'DISDETTE PGM' then r.dati ->> 'Nome' else r.dati ->> 'Nome' end as nome,
             r.dati ->> 'Cognome' as cognome,
             r.dati ->> 'Email' as email,
             coalesce(r.dati ->> 'Cellulare', r.dati ->> 'Telefono') as telefono,
             coalesce(r.dati ->> 'CODICE FISCALE', r.dati ->> 'Codice Fiscale') as cf,
             case when r.tabella = 'NUOVI CONTRATTI' then airtable.testo(r.dati ->> 'User Number') end as numero_socio,
             airtable.ts(coalesce(r.dati ->> 'Data di creazione', r.dati ->> 'Data Acquisto', r.dati ->> 'Data Inizio')) as quando
    ) x
   where r.tabella in ('Lista Opportunità', 'NUOVI CONTRATTI', 'PASS', 'DISDETTE PGM')
     and (airtable.testo(x.nome) is not null or airtable.testo(x.cognome) is not null
          or public.normalizza_email(x.email) is not null or public.normalizza_telefono(x.telefono) is not null);

  -- Una persona per email; chi non ha email va col telefono.
  create temp table gruppo_email on commit drop as
    select email_norm, gen_random_uuid() as utente_id from cand where email_norm is not null group by email_norm;

  create temp table tel_di_email on commit drop as
    select distinct on (c.tel_norm) c.tel_norm, g.utente_id
      from cand c join gruppo_email g using (email_norm)
     where c.tel_norm is not null
     group by c.tel_norm, g.utente_id
     order by c.tel_norm, count(*) desc, max(c.quando) desc;

  create temp table gruppo_tel on commit drop as
    select c.tel_norm, gen_random_uuid() as utente_id
      from cand c
     where c.email_norm is null and c.tel_norm is not null
       and not exists (select 1 from tel_di_email t where t.tel_norm = c.tel_norm)
     group by c.tel_norm;

  create temp table persona on commit drop as
    select c.*,
           coalesce(g.utente_id, t.utente_id, gt.utente_id,
                    -- ne' email ne' telefono: una persona per record
                    md5(c.rec)::uuid) as utente_id
      from cand c
      left join gruppo_email g on g.email_norm = c.email_norm
      left join tel_di_email t on c.email_norm is null and t.tel_norm = c.tel_norm
      left join gruppo_tel gt on c.email_norm is null and gt.tel_norm = c.tel_norm;
  create index on persona (rec);

  insert into public.utenti (id, nome, cognome, email, telefono, codice_fiscale, creato_il, aggiornato_il)
  select distinct on (utente_id) utente_id,
         -- i dati dal record piu' recente che li ha
         first_value(nome) over w_nome, first_value(cognome) over w_nome,
         first_value(email) over w_email, first_value(telefono) over w_tel,
         first_value(cf) over w_cf,
         min(quando) over w_tutto, max(quando) over w_tutto
    from persona
  window w_tutto as (partition by utente_id),
         w_nome  as (partition by utente_id order by (nome is null), quando desc nulls last),
         w_email as (partition by utente_id order by (email is null), quando desc nulls last),
         w_tel   as (partition by utente_id order by (telefono is null), quando desc nulls last),
         w_cf    as (partition by utente_id order by (cf is null), quando desc nulls last)
   order by utente_id;

  -- Il socio di PerfectGym (solo club Passion Fitness): prima il numero socio
  -- dei nuovi contratti, poi l'email, poi il telefono.
  create temp table soci on commit drop as
    select m.id, m.numero, ltrim(m.numero, '0') as numero_nudo, lower(m.email) as email,
           public.normalizza_telefono(m.telefono) as tel, m.member_type, m.version
      from perfectgym.members m
     where not m.is_deleted and coalesce(m.home_club_id, 1) = 1;
  create index on soci (numero_nudo);
  create index on soci (email);
  create index on soci (tel);

  update public.utenti u set member_id = s.id
    from (select distinct on (p.utente_id) p.utente_id, so.id
            from persona p join soci so on so.numero_nudo = ltrim(p.numero_socio, '0')
           where p.numero_socio is not null
           order by p.utente_id, p.quando desc) s
   where s.utente_id = u.id;

  update public.utenti u set member_id = s.id
    from (select distinct on (u2.id) u2.id as utente_id, so.id
            from public.utenti u2 join soci so on so.email = u2.email_norm
           where u2.member_id is null
           order by u2.id, (so.member_type = 'Member') desc, so.version desc) s
   where s.utente_id = u.id;

  update public.utenti u set member_id = s.id
    from (select distinct on (u2.id) u2.id as utente_id, so.id
            from public.utenti u2 join soci so on so.tel = u2.telefono_norm
           where u2.member_id is null
           order by u2.id, (so.member_type = 'Member') desc, so.version desc) s
   where s.utente_id = u.id;

  -- -------------------------------------------------------------------------
  -- Le opportunita', lette una volta
  -- -------------------------------------------------------------------------
  create temp table opp on commit drop as
  select r.id as rec, p.utente_id,
         r.dati ->> 'Tipologia Opportunità' as tipo,
         r.dati ->> 'Stato opportunità' as stato,
         airtable.testo(r.dati ->> 'Fonte') as fonte_airtable,
         (select sc.staff_id from st_commerciale sc where sc.rec = r.dati -> 'Assegnato a' ->> 0) as assegnato_a,
         coalesce(airtable.ts(r.dati ->> 'Data di creazione'), r.creato_il) as creato_il,
         airtable.ts(r.dati ->> 'Last Modified Stato opportunità') as stato_cambiato_il,
         r.dati
    from airtable.record r
    join persona p on p.rec = r.id
   where r.tabella = 'Lista Opportunità'
     and coalesce(r.dati ->> 'Fonte', '') !~* 'test'
     and coalesce(r.dati ->> 'Nome', '') !~* '^\s*test\s*$';

  -- -------------------------------------------------------------------------
  -- Lead
  -- -------------------------------------------------------------------------
  insert into public.lead (utente_id, fonte, fonte_dettaglio, attivita_interesse, orario_ricontatto,
                           presentato_da, telefono_presentatore, meta_campagna, meta_adset, meta_form,
                           fase, esito, assegnato_a, chiuso_il, contract_id, note, creato_il, aggiornato_il, airtable_id)
  select o.utente_id,
         f.fonte,
         case f.fonte
           when 'sito' then coalesce(lower(substring(o.fonte_airtable from '(?i)(btn_[a-z_]+|floating[-_]btn)')), o.fonte_airtable)
           when 'meta' then coalesce(airtable.testo(o.dati ->> 'META: Campaign Name'), o.fonte_airtable)
           else nullif(o.fonte_airtable, 'TOUR')
         end,
         airtable.testo(o.dati ->> 'Attività di interesse'),
         airtable.testo(o.dati ->> 'Orario di Ricontatto Desiderato'),
         airtable.testo(o.dati ->> 'Presentato da'),
         airtable.testo(o.dati ->> 'Telefono Referrer'),
         airtable.testo(o.dati ->> 'META: Campaign Name'),
         airtable.testo(o.dati ->> 'META: Ad Set'),
         airtable.testo(o.dati ->> 'META: Nome Form'),
         case when o.tipo = 'Pass' then 'vinta' else case o.stato
           when 'Vinta' then 'vinta'
           when 'Persa' then 'persa'
           when 'Doppione' then 'persa'
           else case when o.assegnato_a is not null then 'in_gestione' else 'da_gestire' end
         end end,
         case when o.tipo = 'Pass' then 'prova' when o.stato = 'Vinta' then
           case when o.dati ->> 'Prova attivata' = 'SI' then 'prova'
                when o.dati ? 'Contract ID' or airtable.testo(o.dati ->> 'Nome dell''abbonamento') is not null then 'contratto'
           end
         end,
         o.assegnato_a,
         case when o.tipo = 'Pass' then o.creato_il
              when o.stato in ('Vinta', 'Persa', 'Doppione')
              then coalesce(o.stato_cambiato_il, airtable.ts(o.dati ->> 'Giorno e ora prova attivata'), o.creato_il) end,
         (o.dati ->> 'Contract ID')::numeric::bigint,
         concat_ws(E'\n', airtable.testo(o.dati ->> 'Note'),
                   case when o.stato = 'Doppione' then 'Segnata come doppione su Airtable.' end),
         o.creato_il, coalesce(o.stato_cambiato_il, o.creato_il), o.rec
    from opp o
    cross join lateral (select case
      when o.tipo = 'Tour' then 'tour'
      when o.tipo = 'Referral' then 'referral'
      when o.fonte_airtable ~* 'meta ads|fb \| paid' then 'meta'
      when o.fonte_airtable ~* 'sitoweb|btn_|floating|ply \||chatgpt|acquedotti' then 'sito'
      when o.fonte_airtable ~* '^tour$' then 'tour'
      else 'altro' end as fonte) f
   where o.tipo in ('Lead', 'Referral', 'Tour')
      or (o.tipo = 'Pass' and o.stato is distinct from 'Doppione');

  -- I doppioni puntano al primo lead della stessa persona.
  update public.lead d set doppione_di = x.primo
    from (select l.id, (select l2.id from public.lead l2
                         where l2.utente_id = l.utente_id and l2.id <> l.id
                           and l2.note is distinct from 'Segnata come doppione su Airtable.'
                           and coalesce(l2.note, '') not like '%Segnata come doppione su Airtable.%'
                         order by l2.creato_il limit 1) as primo
            from public.lead l where l.note like '%Segnata come doppione su Airtable.%') x
   where x.id = d.id and x.primo is not null;

  -- -------------------------------------------------------------------------
  -- Prove
  -- -------------------------------------------------------------------------
  insert into public.prove (utente_id, tipo_pass, data_inizio, data_fine, gestito_da, esito, insegnante, note, creato_il, airtable_id)
  select o.utente_id,
         coalesce(airtable.testo(o.dati ->> 'Tipo di Prova Attivata'), airtable.testo(o.dati ->> 'Attività di interesse')),
         coalesce(airtable.ts(o.dati ->> 'Data di inizio Prova'), o.creato_il),
         airtable.ts(o.dati ->> 'Data di fine Prova'),
         o.assegnato_a,
         case o.stato when 'Vinta' then 'iscritto' when 'Persa' then 'non_iscritto' end,
         airtable.testo(o.dati ->> 'Insegnanti'),
         airtable.testo(o.dati ->> 'Note'),
         o.creato_il, o.rec
    from opp o
   where o.tipo = 'Pass' and o.stato is distinct from 'Doppione';

  -- La vecchia tabella PASS, se la stessa prova non c'e' gia'.
  insert into public.prove (utente_id, tipo_pass, data_inizio, data_fine, gestito_da, esito, obiezione, creato_il, airtable_id)
  select p.utente_id,
         ltrim(coalesce(airtable.testo(r.dati ->> 'PASS'), airtable.testo(r.dati ->> 'Abbonamento')), '# '),
         airtable.ts(r.dati ->> 'Data Inizio'),
         airtable.ts(r.dati ->> 'Data fine'),
         (select s.id from public.staff s where s.airtable_nome = upper(trim(r.dati ->> 'GESTITO DA'))),
         case when r.dati ->> ' ISCRITTO' = 'SI' then 'iscritto' end,
         airtable.testo(r.dati ->> 'Obiezione'),
         coalesce(airtable.ts(r.dati ->> 'Data Inizio'), r.creato_il), r.id
    from airtable.record r
    join persona p on p.rec = r.id
   where r.tabella = 'PASS'
     and not exists (select 1 from public.prove pr
                      where pr.utente_id = p.utente_id
                        and (pr.data_inizio at time zone 'Europe/Rome')::date = airtable.giorno(r.dati ->> 'Data Inizio'));

  -- Il pass su PerfectGym: un contratto «pass/prova/guest» della persona,
  -- iniziato entro tre giorni dalla prova. Un contratto, una prova.
  update public.prove pr set contract_id = x.contract_id
    from (select distinct on (c.id) pr2.id as prova_id, c.id as contract_id
            from public.prove pr2
            join public.utenti u on u.id = pr2.utente_id and u.member_id is not null
            join perfectgym.contracts c on c.member_id = u.member_id and not c.is_deleted
            join perfectgym.payment_plans pp on pp.id = c.payment_plan_id and pp.nome ~* 'pass|prova|guest'
           where c.data_inizio between (pr2.data_inizio at time zone 'Europe/Rome')::date - 3
                                   and (pr2.data_inizio at time zone 'Europe/Rome')::date + 3
           order by c.id, abs(c.data_inizio - (pr2.data_inizio at time zone 'Europe/Rome')::date), pr2.creato_il desc) x
   where x.prova_id = pr.id
     and not exists (select 1 from public.prove o where o.contract_id = x.contract_id);

  -- La prova nasce da un lead: il piu' recente della stessa persona, aperto
  -- prima della prova.
  update public.prove pr set lead_id = x.lead_id
    from (select pr2.id, coalesce(
                   (select l.id from public.lead l where l.airtable_id = pr2.airtable_id),
                   (select l.id from public.lead l
                     where l.utente_id = pr2.utente_id and l.creato_il <= pr2.creato_il + interval '1 day'
                     order by l.creato_il desc limit 1)) as lead_id
            from public.prove pr2) x
   where x.id = pr.id and x.lead_id is not null;

  -- -------------------------------------------------------------------------
  -- Nuovi contratti
  -- -------------------------------------------------------------------------
  create temp table nc on commit drop as
  select r.id as rec, p.utente_id, r.dati, r.creato_il,
         coalesce(
           (select c.id from perfectgym.contracts c where c.id = (r.dati ->> 'ContractID')::numeric::bigint),
           (select c.id
              from soci so
              join perfectgym.contracts c on c.member_id = so.id and not c.is_deleted
              left join perfectgym.payment_plans pp on pp.id = c.payment_plan_id
             where so.numero_nudo = ltrim(r.dati ->> 'User Number', '0')
               and c.data_firma between airtable.giorno(r.dati ->> 'Data Acquisto') - 1
                                    and airtable.giorno(r.dati ->> 'Data Acquisto') + 1
             order by (pp.nome = ltrim(r.dati ->> 'Abbonamento', '^ ')) desc nulls last,
                      coalesce(c.aggiuntivo, false), abs(c.data_firma - airtable.giorno(r.dati ->> 'Data Acquisto')), c.id desc
             limit 1)) as contract_id
    from airtable.record r
    left join persona p on p.rec = r.id
   where r.tabella = 'NUOVI CONTRATTI';

  insert into public.nuovi_contratti (contract_id, utente_id, member_id, controllo, tesseramento, numero_tessera,
                                      errore_asi, referral, note, creato_il, airtable_id)
  select distinct on (n.contract_id)
         n.contract_id, n.utente_id, c.member_id,
         case n.dati ->> 'CONTROLLATO' when 'SI' then 'controllato' when 'ERRORE' then 'errore'
                                        when 'IN CORSO' then 'in_corso' else 'da_controllare' end,
         case n.dati ->> 'Tesserato' when 'SI' then 'si' when 'GIA PRESENTE' then 'gia_presente' when 'no' then 'no' end,
         airtable.testo(n.dati ->> 'Numero Tessera'),
         airtable.testo(n.dati ->> 'ERRORE ASI'),
         airtable.testo(n.dati ->> 'REFERRAL'),
         airtable.testo(n.dati ->> 'Note'),
         coalesce(airtable.ts(n.dati ->> 'Data Acquisto'), n.creato_il), n.rec
    from nc n
    join perfectgym.contracts c on c.id = n.contract_id
   order by n.contract_id, n.creato_il desc;

  -- -------------------------------------------------------------------------
  -- Disdette
  -- -------------------------------------------------------------------------
  insert into public.disdette (contract_id, utente_id, member_id, data_disdetta, esito, gestito_da, gestito_il, note, creato_il, airtable_id)
  select distinct on (coalesce(x.contract_id::text, x.rec)) x.contract_id, x.utente_id, coalesce(c.member_id, u.member_id),
         coalesce(c.data_disdetta, (x.creato_il at time zone 'Europe/Rome')::date),
         x.esito, x.assegnato_a, x.gestito_il, x.note, x.creato_il, x.rec
    from (select o.rec, o.utente_id, o.assegnato_a, o.creato_il,
                 (o.dati ->> 'Contract ID')::numeric::bigint as contract_id,
                 case o.stato when 'Vinta' then 'vinto' when 'Persa' then 'perso' end as esito,
                 case when o.stato in ('Vinta', 'Persa') then coalesce(o.stato_cambiato_il, o.creato_il) end as gestito_il,
                 airtable.testo(o.dati ->> 'Note') as note
            from opp o where o.tipo = 'Disdetta' and o.stato is distinct from 'Doppione') x
    left join perfectgym.contracts c on c.id = x.contract_id
    left join public.utenti u on u.id = x.utente_id
   order by coalesce(x.contract_id::text, x.rec), x.creato_il desc;

  insert into public.disdette (utente_id, member_id, data_disdetta, motivo, contatto, esito, gestito_da, valore_contratto, creato_il, airtable_id)
  select p.utente_id, u.member_id,
         coalesce(airtable.data_it(r.dati ->> 'Data Annullamento'), airtable.data_it(r.dati ->> 'Data di conclusione'),
                  (r.dati ->> 'Data di conclusione')::date),
         airtable.motivo_disdetta(r.dati ->> 'Motivo Annullamento'),
         case r.dati ->> 'Tel./App.' when 'Telefonata' then 'telefonata' when 'Appuntamento' then 'appuntamento' end,
         case r.dati ->> 'Stato' when 'VINTO' then 'vinto' when 'PERSO' then 'perso' when 'STANDBY' then 'standby' end,
         (select s.id from public.staff s
           where lower(s.nome || ' ' || coalesce(s.cognome, '')) = lower(trim(r.dati ->> 'Consulente'))
              or s.airtable_nome = upper(split_part(trim(r.dati ->> 'Consulente'), ' ', 1))
           order by (lower(s.nome || ' ' || coalesce(s.cognome, '')) = lower(trim(r.dati ->> 'Consulente'))) desc limit 1),
         (r.dati ->> 'Valore Contratto')::numeric,
         r.creato_il, r.id
    from airtable.record r
    join persona p on p.rec = r.id
    left join public.utenti u on u.id = p.utente_id
   where r.tabella = 'DISDETTE PGM';

  -- -------------------------------------------------------------------------
  -- Commenti e task
  -- -------------------------------------------------------------------------
  insert into public.commenti (utente_id, lead_id, testo, autore_id, autore_nome, creato_il, airtable_id)
  select o.utente_id, l.id, airtable.testo(r.dati ->> 'Testo del commento'),
         s.id, r.dati -> 'Autore del commento' ->> 'name',
         coalesce(airtable.ts(r.dati ->> 'Created Comment'), r.creato_il), r.id
    from airtable.record r
    join opp o on o.rec = r.dati -> 'Link al contatto' ->> 0
    left join public.lead l on l.airtable_id = o.rec
    left join public.staff s on s.email = lower(r.dati -> 'Autore del commento' ->> 'email')
   where r.tabella = 'Commenti' and airtable.testo(r.dati ->> 'Testo del commento') is not null;

  insert into public.task (utente_id, lead_id, tipo, data, nota, assegnato_a, creato_da, autore_nome,
                           completato_il, esito, creato_il, airtable_id)
  select o.utente_id, l.id,
         case r.dati ->> 'Tipologia di Task'
           when 'TELEFONATA' then 'telefonata' when 'IN SEDE' then 'in_sede' when 'WHATSAPP' then 'whatsapp'
           when 'EMAIL' then 'email' when 'Appuntamento' then 'appuntamento' else 'richiamare' end,
         airtable.ts(r.dati ->> 'Data del Task'),
         airtable.testo(r.dati ->> 'Nota Task'),
         s.id, s.id, r.dati -> 'Autore del Task' ->> 'name',
         case when r.dati ->> 'Completato' = 'Si'
              then coalesce(airtable.ts(r.dati ->> 'Quando un task viene completato'), airtable.ts(r.dati ->> 'Data del Task'), r.creato_il) end,
         lower(r.dati ->> 'ESITO TASK'),
         coalesce(airtable.ts(r.dati ->> 'Created Task'), r.creato_il), r.id
    from airtable.record r
    join opp o on o.rec = r.dati -> 'Contatto' ->> 0
    left join public.lead l on l.airtable_id = o.rec
    left join public.staff s on s.email = lower(r.dati -> 'Autore del Task' ->> 'email')
   where r.tabella = 'Task';

  -- -------------------------------------------------------------------------
  -- Il resoconto
  -- -------------------------------------------------------------------------
  select jsonb_build_object(
    'utenti', (select count(*) from public.utenti),
    'utenti_con_socio', (select count(*) from public.utenti where member_id is not null),
    'lead', (select jsonb_object_agg(fase, n) from (select fase, count(*) n from public.lead group by fase) x),
    'lead_per_fonte', (select jsonb_object_agg(fonte, n) from (select fonte, count(*) n from public.lead group by fonte) x),
    'prove', (select count(*) from public.prove),
    'prove_col_pass', (select count(*) from public.prove where contract_id is not null),
    'nuovi_contratti', (select count(*) from public.nuovi_contratti),
    'nuovi_contratti_non_abbinati', (select count(*) from nc where contract_id is null),
    'disdette', (select count(*) from public.disdette),
    'commenti', (select count(*) from public.commenti),
    'commenti_airtable', (select count(*) from airtable.record where tabella = 'Commenti'),
    'task', (select count(*) from public.task),
    'task_airtable', (select count(*) from airtable.record where tabella = 'Task'),
    'opportunita_escluse_test', (select count(*) from airtable.record r where r.tabella = 'Lista Opportunità')
                                - (select count(*) from opp)
  ) into esito;
  return esito;
end;
$$;

revoke all on function airtable.ricostruisci_crm() from public, anon, authenticated;

comment on function airtable.ricostruisci_crm() is
  'Svuota il CRM e lo ricostruisce dalla copia di Airtable (airtable.record). Solo prima di andare dal vivo: si rifiuta se nel CRM ci sono righe nate nel CRM.';
