-- L'appello: i segnali First Timer, Prova e Nuovo iscritto
--
-- Ogni prenotato di `crm.appello_lezioni` porta tre segnali, come nell'appello
-- del CRM Athlon, per riconoscere le persone da seguire meglio:
--
--   prima_volta         «First Timer»: e' la sua prima volta a QUESTO TIPO di
--                       lezione (il tipo di PerfectGym: «Pilates», «Reformer
--                       PLUS»..., non la singola data). Lo e' se prima dell'inizio
--                       di questa lezione non ha nessuna altra prenotazione
--                       confermata (non annullata, non in lista d'attesa) dello
--                       stesso tipo. Non si chiede che la volta prima sia
--                       «presente»: a molte lezioni l'appello non si faceva e
--                       tornerebbe First Timer a ogni lezione; sbaglia per difetto;
--   prova_piano,
--   prova_fine          «Prova»: nel giorno della lezione ha un pass di prova in
--                       corso (Guest Pass da 7 o 10 giorni, o un pass giornaliero:
--                       gli stessi di Abbonamenti, `crm.e_pass_prova`); il nome del
--                       pass e la fine;
--   primo_abbonamento   «Nuovo iscritto»: e' dentro le sue prime due settimane di
--                       abbonamento, cioe' nel giorno della lezione il suo primo
--                       abbonamento principale (il piu' vecchio, anche del vecchio
--                       gestionale) e' partito da meno di 14 giorni; la data di inizio.
--
-- Ogni prenotato porta anche la data di nascita (`data_nascita`), da cui la schermata
-- calcola l'eta'.
--
-- Una persona puo' avere piu' segnali insieme (un Guest Pass alla prima lezione:
-- Prova e First Timer). Anche l'ora in cui e' stata segnata la presenza e l'ordine
-- per nome, come in Athlon.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

-- Perche' la domanda del First Timer si risponda dal solo indice.
create index if not exists class_bookings_member_confermate_idx
  on perfectgym.class_bookings (member_id, class_id)
  where not is_deleted and not coalesce(annullata, false) and not coalesce(in_attesa, false);

create index if not exists classes_id_tipo_inizio_idx
  on perfectgym.classes (id) include (class_type_id, inizio)
  where not is_deleted;

create or replace function crm.appello_lezioni(
  p_da timestamptz, p_a timestamptz,
  p_istruttori bigint[] default null, p_istruttore bigint default null, p_lezione bigint default null,
  p_categoria bigint default null, p_sala bigint default null, p_utente boolean default false)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'class_id', c.id, 'inizio', c.inizio, 'fine', c.fine,
      'lezione', t.nome, 'lezione_id', c.class_type_id,
      'categoria', k.nome, 'categoria_id', t.category_id,
      'sala', z.nome, 'sala_id', c.club_zone_id,
      'istruttore', nullif(trim(coalesce(e.nome, '') || ' ' || coalesce(e.cognome, '')), ''), 'istruttore_id', c.instructor_id,
      'posti', c.posti,
      'finestra', crm.appello_finestra(c.inizio, c.fine),
      'apre_il', c.inizio - interval '59 minutes',
      'chiude_il', coalesce(c.fine, c.inizio + interval '1 hour') + interval '59 minutes',
      'prenotati', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'booking_id', b.id, 'member_id', b.member_id, 'nome', m.nome, 'cognome', m.cognome, 'data_nascita', m.data_nascita,
                 'presente', coalesce(o.presente, b.presente, false),
                 'segnato_da', crm.nome_staff(o.segnato_da),
                 'segnato_il', o.segnato_il,
                 'da_inviare', o.booking_id is not null and o.inviato_pg_il is null,
                 'prima_volta', not exists (
                     select 1 from perfectgym.class_bookings b2
                       join perfectgym.classes c2 on c2.id = b2.class_id
                      where b2.member_id = b.member_id and c2.class_type_id = c.class_type_id and c2.inizio < c.inizio
                        and not b2.is_deleted and not coalesce(b2.annullata, false) and not coalesce(b2.in_attesa, false)
                        and not c2.is_deleted),
                 'prova_piano', pr.piano,
                 'prova_fine', pr.fine,
                 'primo_abbonamento', case when (c.inizio at time zone 'Europe/Rome')::date between pa.inizio and pa.inizio + 13 then pa.inizio end,
                 'utente_id', case when p_utente then (select x.id from public.utenti x where x.member_id = b.member_id
                                                        order by exists (select 1 from public.lead l where l.utente_id = x.id) desc limit 1) end)
               order by m.nome, m.cognome)
          from perfectgym.class_bookings b
          left join perfectgym.members m on m.id = b.member_id
          left join public.appello_presenze o on o.booking_id = b.id
          left join lateral (
            select p.nome as piano,
                   coalesce(kk.data_fine, kk.data_inizio + greatest(coalesce((p.dati -> 'commitmentPeriod' ->> 'days')::int, 1), 1)) as fine
              from perfectgym.contracts kk
              join perfectgym.payment_plans p on p.id = kk.payment_plan_id
             where kk.member_id = b.member_id and not kk.is_deleted and crm.e_pass_prova(p.nome)
               and kk.data_inizio <= (c.inizio at time zone 'Europe/Rome')::date
               and coalesce(kk.data_fine, kk.data_inizio + greatest(coalesce((p.dati -> 'commitmentPeriod' ->> 'days')::int, 1), 1))
                   >= (c.inizio at time zone 'Europe/Rome')::date
             order by kk.data_inizio desc limit 1) pr on true
          left join lateral (
            select min(kk.data_inizio) as inizio
              from perfectgym.contracts kk
              join perfectgym.payment_plans p on p.id = kk.payment_plan_id
             where kk.member_id = b.member_id and not kk.is_deleted and kk.data_inizio is not null
               and not coalesce(p.aggiuntivo, false) and not crm.e_pass(p.nome) and (p.canone > 0 or p.nome ~* '^OLD')) pa on true
         where b.class_id = c.id and not b.is_deleted and not coalesce(b.annullata, false) and not coalesce(b.in_attesa, false)
      ), '[]'::jsonb)
    ) order by c.inizio, t.nome), '[]'::jsonb)
    from perfectgym.classes c
    left join perfectgym.class_types t on t.id = c.class_type_id
    left join perfectgym.class_categories k on k.id = t.category_id
    left join perfectgym.club_zones z on z.id = c.club_zone_id
    left join perfectgym.employees e on e.id = c.instructor_id
   where not c.is_deleted
     and c.club_id = (select valore::bigint from crm.impostazioni where chiave = 'club_id')
     and c.inizio >= p_da and c.inizio < p_a
     and (p_istruttori is null or c.instructor_id = any (p_istruttori))
     and (p_istruttore is null or c.instructor_id = p_istruttore)
     and (p_lezione is null or c.class_type_id = p_lezione)
     and (p_categoria is null or t.category_id = p_categoria)
     and (p_sala is null or c.club_zone_id = p_sala)
$$;
