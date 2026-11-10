-- Azioni istruttore: «abbonamento attivo» = contratto Current, e il recupero e' una lista statica
--
-- Correzione di 20261110b/c.
--
-- 1. Cosa vuol dire «abbonamento attivo». Il campo `attivo` di PerfectGym resta acceso anche
--    sui contratti finiti (stato Ended, con la data di fine passata): in 5.023 persone c'erano
--    piu' di 2.600 con un contratto gia' scaduto, compresi i vecchi piani OLD. Ora un abbonamento
--    vero attivo e' un contratto in stato Current, gia' partito, con la fine non passata, senza
--    disdetta, di un piano che non e' pass/prova/Guest Pass, ne' un aggiuntivo, ne' esclusso
--    (Wellhub e simili), con un canone. Vale per il benvenuto (regola `attivo`/`nessuno_attivo`)
--    e per l'abbonamento mostrato nella lista.
-- 2. Il recupero Formula 8 e' una lista STATICA, creata una volta sola: da qui in poi chi si iscrive
--    arriva in «Nuovi iscritti», non nel recupero. Si rifa' la lista con la regola giusta (2.142
--    persone) e si tolgono le funzioni e l'automazione che servivano a crearla: restano solo le
--    azioni, da smaltire un po' alla volta.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

do $mig$
declare
  def text;
  nuova text;
  prima text;
begin
  -- candidati del benvenuto
  def := pg_get_functiondef('crm.azioni_istruttori_candidati(jsonb, date, date)'::regprocedure);
  nuova := replace(def, $a$coalesce(c.attivo, false)$a$,
    $b$c.stato = 'Current' and c.data_disdetta is null and (c.data_fine is null or c.data_fine >= r.oggi)$b$);
  if nuova = def then raise exception 'azioni_istruttori_candidati: controllo attivo non trovato'; end if;
  execute nuova;

  -- l'abbonamento mostrato nella lista
  def := pg_get_functiondef('public.crm_azioni_istruttori(text, text, text, text, integer)'::regprocedure);
  nuova := replace(def, $a$coalesce(c.attivo, false)$a$,
    $b$c.stato = 'Current' and c.data_disdetta is null and (c.data_fine is null or c.data_fine >= oggi)$b$);
  if nuova = def then raise exception 'crm_azioni_istruttori: controllo attivo non trovato'; end if;
  execute nuova;
end;
$mig$;

-- La lista di recupero, rifatta una volta con la regola giusta (nessuna era stata presa o chiusa).
delete from public.azioni_istruttori
 where tipo = 'recupero_formula8' and assegnato_a is null and completato_il is null;

select crm.azioni_recupero_genera(100000);

-- Lista statica: via le funzioni e l'automazione che la creavano.
drop function if exists public.crm_azioni_recupero_genera();
drop function if exists public.crm_azioni_recupero_anteprima();
drop function if exists crm.azioni_recupero_genera(int);
drop function if exists crm.azioni_recupero_candidati();
delete from public.automazioni where chiave = 'azioni_istruttori_recupero';
