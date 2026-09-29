-- La retention: le pause brevi non la interrompono
--
-- In `20260929s` bastava un giorno di vuoto fra un abbonamento principale e
-- il successivo per perdere la continuita'. Ora una pausa breve non conta:
-- chi riparte entro 30 giorni dalla fine resta iscritto senza interruzioni,
-- come per i rinnovi e le catene del resto della dashboard (`crm.catene`). I
-- piani OLD del vecchio gestionale, a canone zero, restano abbonamenti a tutti
-- gli effetti.
--
-- `da_un_anno` conta chi e' iscritto in tutti e due i giorni (l'ultimo del mese
-- e lo stesso di un anno prima) con i due abbonamenti nella stessa permanenza:
-- in mezzo nessun vuoto sopra i 30 giorni. Chi era in pausa proprio uno dei
-- due giorni non e' iscritto quel giorno, e non conta. Il 29/09/2026: 1.100
-- dei 2.388 iscritti lo erano anche il 29/09/2025 (46%, contro il 44% senza
-- pause); dei 1.972 iscritti di allora e' ancora il 56%.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

do $$
declare
  def text := pg_get_functiondef('public.crm_abbonamenti()'::regprocedure);
  nuova text := def;
  prima text;
begin
  -- Le permanenze: ogni abbonamento principale col numero del suo tratto; il
  -- tratto si chiude solo dopo piu' di 30 giorni di vuoto.
  prima := nuova;
  nuova := replace(nuova, $a$  senza_pause as materialized (
    select g.member_id, min(g.inizio) as inizio, max(g.fine) as fine
      from (select f.*, sum(case when f.fine_prima is null or f.inizio > f.fine_prima + 1 then 1 else 0 end)
                          over (partition by f.member_id order by f.inizio, f.id) as tratto
              from principali_in_fila f) g
     group by g.member_id, g.tratto
  ),
$a$, $b$  permanenze as materialized (
    select f.id, f.member_id, f.inizio, f.fine,
           sum(case when f.fine_prima is null or f.inizio > f.fine_prima + 30 then 1 else 0 end)
             over (partition by f.member_id order by f.inizio, f.id) as tratto
      from principali_in_fila f
  ),
$b$);
  if nuova = prima then raise exception 'crm_abbonamenti: senza_pause non trovato'; end if;

  -- Iscritti in tutti e due i giorni, nella stessa permanenza.
  prima := nuova;
  nuova := replace(nuova, $a$             'da_un_anno', (select count(distinct k.member_id) from senza_pause k
                             where k.inizio <= (m.fine - interval '1 year')::date and k.fine >= m.fine)
$a$, $b$             'da_un_anno', (select count(distinct a.member_id)
                              from permanenze a
                              join permanenze b on b.member_id = a.member_id and b.tratto = a.tratto
                             where a.inizio <= m.fine and a.fine >= m.fine
                               and b.inizio <= (m.fine - interval '1 year')::date
                               and b.fine >= (m.fine - interval '1 year')::date)
$b$);
  if nuova = prima then raise exception 'crm_abbonamenti: da_un_anno non trovato'; end if;

  execute nuova;
end;
$$;
