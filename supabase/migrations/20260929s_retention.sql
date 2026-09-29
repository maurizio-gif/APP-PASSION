-- La dashboard abbonamenti: la retention, su base annuale
--
-- Per ogni mese degli ultimi 24: degli iscritti di quel mese, quanti erano
-- iscritti anche lo stesso mese dell'anno prima, senza pause (settembre 2026
-- contro settembre 2025, agosto 2026 contro agosto 2025...). `crm_abbonamenti()`
-- restituisce `retention`, un mese per riga:
--
--   iscritti     le persone con un abbonamento principale attivo l'ultimo giorno
--                del mese (oggi, per il mese in corso);
--   anno_prima   le persone con un abbonamento principale attivo lo stesso
--                giorno di un anno prima;
--   da_un_anno   le persone iscritte in tutti e due i giorni e, in mezzo, senza
--                un giorno di pausa.
--
-- Abbonamento principale: un contratto non aggiuntivo a pagamento (come nel
-- resto della dashboard) o dei piani OLD del vecchio gestionale, a canone zero:
-- fino all'estate 2024 i soci erano li' (il 30/09/2024 966, contro 529 a
-- pagamento), e chi e' passato da un OLD a un piano a pagamento senza pause e'
-- rimasto iscritto. Senza pause: il contratto dopo parte al massimo il giorno
-- dopo la fine di quello prima (un cambio che finisce il 30 settembre e riparte
-- il primo ottobre e' continuita'; anche un giorno di vuoto e' una pausa). I
-- congelati (Freezed) contano, come negli abbonamenti attivi. Il 29/09/2026:
-- 2.388 iscritti, 1.062 da un anno (44%), su 1.972 iscritti un anno prima.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

do $$
declare
  def text := pg_get_functiondef('public.crm_abbonamenti()'::regprocedure);
  nuova text := def;
  prima text;
begin
  -- I tratti senza pause di abbonamenti principali, e la retention per mese
  -- (dopo `mesi`, prima di `per_mese`).
  prima := nuova;
  nuova := replace(nuova, E'  per_mese as (\n', $b$  principali as materialized (
    select c.id, c.member_id, c.data_inizio as inizio, coalesce(c.data_fine, 'infinity'::date) as fine
      from perfectgym.contracts c
      join perfectgym.payment_plans p on p.id = c.payment_plan_id
     where c.club_id = club and not c.is_deleted and c.data_inizio is not null and c.data_inizio <= oggi
       and not coalesce(p.aggiuntivo, false) and (p.canone > 0 or p.nome ~* '^OLD')
  ),
  principali_in_fila as (
    select r.*, max(r.fine) over (partition by r.member_id order by r.inizio, r.id
                                  rows between unbounded preceding and 1 preceding) as fine_prima
      from principali r
  ),
  senza_pause as materialized (
    select g.member_id, min(g.inizio) as inizio, max(g.fine) as fine
      from (select f.*, sum(case when f.fine_prima is null or f.inizio > f.fine_prima + 1 then 1 else 0 end)
                          over (partition by f.member_id order by f.inizio, f.id) as tratto
              from principali_in_fila f) g
     group by g.member_id, g.tratto
  ),
  per_retention as (
    select jsonb_agg(jsonb_build_object(
             'mese', m.mese,
             'in_corso', m.fine = oggi,
             'giorno', m.fine,
             'giorno_anno_prima', (m.fine - interval '1 year')::date,
             'iscritti', (select count(distinct r.member_id) from principali r
                           where r.inizio <= m.fine and r.fine >= m.fine),
             'anno_prima', (select count(distinct r.member_id) from principali r
                             where r.inizio <= (m.fine - interval '1 year')::date
                               and r.fine >= (m.fine - interval '1 year')::date),
             'da_un_anno', (select count(distinct k.member_id) from senza_pause k
                             where k.inizio <= (m.fine - interval '1 year')::date and k.fine >= m.fine)
           ) order by m.mese) as j
      from mesi m
  ),
  per_mese as (
$b$);
  if nuova = prima then raise exception 'crm_abbonamenti: per_mese non trovato'; end if;

  prima := nuova;
  nuova := replace(nuova, $a$'mesi', (select j from per_mese),$a$,
                          $b$'mesi', (select j from per_mese),
           'retention', (select j from per_retention),$b$);
  if nuova = prima then raise exception 'crm_abbonamenti: mesi non trovati'; end if;

  execute nuova;
end;
$$;
