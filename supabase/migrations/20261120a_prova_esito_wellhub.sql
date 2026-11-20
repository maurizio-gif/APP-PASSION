-- Prove: nuovo esito «Iscritto con Wellhub/Fitprime» (ticket #1079)
--
-- Chi dopo la prova entra con Wellhub o Fitprime non e' un iscritto (non paga un abbonamento alla
-- palestra) ma nemmeno un «Non iscritto». Nuovo esito `wellhub`, scelto a mano dalla tendina della
-- prova. Non conta fra gli iscritti e non va fra le Perse.
-- Se poi su PerfectGym compare un abbonamento vero, la prova diventa «Iscritto» da sola, come oggi
-- (crm.prove_esiti_dal_mirror tocca ogni esito diverso da iscritto); il «Non iscritto» automatico
-- invece tocca solo le prove senza esito, quindi non lo sovrascrive.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

alter table public.prove drop constraint if exists prove_esito_check;
alter table public.prove add constraint prove_esito_check check (esito = any (array['iscritto', 'non_iscritto', 'wellhub']));

do $mig$
declare
  def text;
  vecchio text := $a$p_esito not in ('iscritto', 'non_iscritto', '')$a$;
  nuovo text := $b$p_esito not in ('iscritto', 'non_iscritto', 'wellhub', '')$b$;
  volte int;
begin
  def := pg_get_functiondef('public.crm_prova_aggiorna'::regproc);
  volte := (length(def) - length(replace(def, vecchio, ''))) / length(vecchio);
  if volte <> 1 then
    raise exception 'crm_prova_aggiorna: il pezzo da cambiare compare % volte (atteso 1)', volte;
  end if;
  execute replace(def, vecchio, nuovo);
end
$mig$;
