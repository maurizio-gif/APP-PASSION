-- La dashboard abbonamenti: i pass di prova per durata del Guest Pass, e chi
-- ha prenotato Reformer o Formula 8
--
-- Ogni mese `crm_abbonamenti()` restituisce anche `prove_per_pass`, una riga
-- per tipo di prova:
--
--   giorni_guest   la durata del Guest Pass (7, 10...); null per chi ha
--                  usato solo pass giornalieri. Se la prova ha piu' Guest Pass
--                  conta il piu' lungo;
--   persone, abbonati                  come `prove` e `prove_abbonati`;
--   reformer, reformer_abbonati        di loro, chi ha prenotato almeno una
--                                      lezione di Reformer (Small Group
--                                      Reformer, Reformer PLUS, Reformer Club,
--                                      Prova Reformer...) dal primo all'ultimo
--                                      giorno della prova, e chi si e'
--                                      abbonato;
--   formula8, formula8_abbonati        lo stesso, per le lezioni Formula 8.
--
-- Prenotata vuol dire non annullata e non in lista d'attesa; la presenza non
-- conta, perche' non sempre viene segnata. Negli ultimi 12 mesi al 27/10/2026:
-- Guest Pass 10 giorni 315 su 597 (53%), 7 giorni 445 su 967 (46%), solo pass
-- giornalieri 235 su 556 (42%).
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

do $$
declare
  def text := pg_get_functiondef('public.crm_abbonamenti()'::regprocedure);
  nuova text := def;
  prima text;
begin
  -- La durata di ogni Guest Pass.
  prima := nuova;
  nuova := replace(nuova, E'           p.nome ~* \'guest\' as guest\n      from perfectgym.contracts c',
    E'           p.nome ~* \'guest\' as guest,\n           case when p.nome ~* \'guest\' then (p.dati -> \'commitmentPeriod\' ->> \'days\')::int end as giorni_guest\n      from perfectgym.contracts c');
  if nuova = prima then raise exception 'crm_abbonamenti: pass_prova non trovato'; end if;

  -- La prova prende il Guest Pass piu' lungo.
  prima := nuova;
  nuova := replace(nuova, E'           bool_or(g.guest) as guest\n      from pass_gruppi g',
    E'           bool_or(g.guest) as guest, max(g.giorni_guest) as giorni_guest\n      from pass_gruppi g');
  if nuova = prima then raise exception 'crm_abbonamenti: prove_senza_esito non trovato'; end if;

  -- Le lezioni prenotate durante la prova.
  prima := nuova;
  nuova := replace(nuova, E'    select q.member_id, q.inizio, q.fine, q.pass, q.guest, min(a.data_inizio) as abbonato_il\n',
    $b$    select q.member_id, q.inizio, q.fine, q.pass, q.guest, q.giorni_guest, min(a.data_inizio) as abbonato_il,
           exists (select 1 from perfectgym.class_bookings b
                     join perfectgym.classes k on k.id = b.class_id
                     join perfectgym.class_types t on t.id = k.class_type_id
                    where b.member_id = q.member_id and not b.is_deleted
                      and not coalesce(b.annullata, false) and not coalesce(b.in_attesa, false)
                      and t.nome ~* 'reformer'
                      and (k.inizio at time zone 'Europe/Rome')::date between q.inizio and q.fine) as reformer,
           exists (select 1 from perfectgym.class_bookings b
                     join perfectgym.classes k on k.id = b.class_id
                     join perfectgym.class_types t on t.id = k.class_type_id
                    where b.member_id = q.member_id and not b.is_deleted
                      and not coalesce(b.annullata, false) and not coalesce(b.in_attesa, false)
                      and t.nome ~* 'formula\s*8'
                      and (k.inizio at time zone 'Europe/Rome')::date between q.inizio and q.fine) as formula8
$b$);
  if nuova = prima then raise exception 'crm_abbonamenti: prove non trovato'; end if;

  prima := nuova;
  nuova := replace(nuova, E'     group by q.member_id, q.inizio, q.fine, q.pass, q.guest\n',
    E'     group by q.member_id, q.inizio, q.fine, q.pass, q.guest, q.giorni_guest\n');
  if nuova = prima then raise exception 'crm_abbonamenti: group by delle prove non trovato'; end if;

  -- Per mese, una riga per tipo di prova.
  prima := nuova;
  nuova := replace(nuova, E'             \'prove_pass\', (select coalesce(sum(q.pass), 0) from prove q where q.fine between m.mese and m.fine and q.fine < oggi)\n',
    $b$             'prove_pass', (select coalesce(sum(q.pass), 0) from prove q where q.fine between m.mese and m.fine and q.fine < oggi),
             'prove_per_pass', (select coalesce(jsonb_agg(to_jsonb(s) order by s.giorni_guest nulls last), '[]'::jsonb)
                                  from (select q.giorni_guest,
                                               count(*) as persone,
                                               count(*) filter (where q.abbonato_il is not null) as abbonati,
                                               count(*) filter (where q.reformer) as reformer,
                                               count(*) filter (where q.reformer and q.abbonato_il is not null) as reformer_abbonati,
                                               count(*) filter (where q.formula8) as formula8,
                                               count(*) filter (where q.formula8 and q.abbonato_il is not null) as formula8_abbonati
                                          from prove q
                                         where q.fine between m.mese and m.fine and q.fine < oggi
                                         group by q.giorni_guest) s)
$b$);
  if nuova = prima then raise exception 'crm_abbonamenti: prove_pass non trovato'; end if;

  execute nuova;
end;
$$;
