-- Il mirror di PerfectGym va avanti da solo
--
-- pg_cron chiama via pg_net:
--   - `perfectgym-sync` ogni minuto: la funzione risponde subito e lavora in
--     background per circa 50 secondi. Prima ricontrolla le entita' gia'
--     complete il cui intervallo e' scaduto, poi porta avanti i download
--     iniziali, fino a quattro insieme. Il lucchetto in
--     `perfectgym.sync_lucchetto` impedisce che due giri si sovrappongano;
--   - `perfectgym-webhook` ogni minuto, con `{"coda": true}`: riprova gli eventi
--     la cui rilettura non e' riuscita (fino a cinque tentativi);
--   - una volta al giorno si butta il log piu' vecchio di 30 giorni.
--
-- Le chiamate portano due cose del Vault:
--   - `perfectgym_sync_anon`: la chiave anon del progetto, che serve solo a
--     passare il gateway di `perfectgym-sync` (`verify_jwt`). E' pubblica, e da
--     sola la funzione la rifiuta. Creata a mano con `vault.create_secret`, non
--     qui, per non scriverla nel repo;
--   - `perfectgym_sync_token`: il token generato in `20260928a`, che e' quello
--     che le funzioni controllano davvero.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.unschedule(jobid) from cron.job
 where jobname in ('perfectgym-sync', 'perfectgym-webhook-coda', 'perfectgym-sync-pulizia-log');

select cron.schedule(
  'perfectgym-sync',
  '* * * * *',
  $cron$
  select net.http_post(
    url := 'https://tihpfycrkjtuppbmcqew.supabase.co/functions/v1/perfectgym-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'perfectgym_sync_anon'),
      'x-sync-token', (select decrypted_secret from vault.decrypted_secrets where name = 'perfectgym_sync_token')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  )
  $cron$
);

select cron.schedule(
  'perfectgym-webhook-coda',
  '* * * * *',
  $cron$
  select net.http_post(
    url := 'https://tihpfycrkjtuppbmcqew.supabase.co/functions/v1/perfectgym-webhook',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sync-token', (select decrypted_secret from vault.decrypted_secrets where name = 'perfectgym_sync_token')
    ),
    body := '{"coda": true}'::jsonb,
    timeout_milliseconds := 10000
  )
  $cron$
);

-- Anche le risposte di pg_net si accumulano (una al minuto per job): si tengono
-- due giorni.
select cron.schedule(
  'perfectgym-sync-pulizia-log',
  '17 3 * * *',
  $cron$
  delete from perfectgym.sync_log where iniziato_il < now() - interval '30 days';
  delete from net._http_response where created < now() - interval '2 days';
  $cron$
);
