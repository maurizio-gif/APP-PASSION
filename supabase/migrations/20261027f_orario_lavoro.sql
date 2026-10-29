-- L'orario di lavoro del primo ricontatto: 9-21 (lun-ven), 10-19:30 (sab e dom)
--
-- Cambia l'orario con cui `crm.minuti_lavoro()` (20261027d) misura i tempi: il
-- tempo scorre dalle 9 alle 21 dal lunedi al venerdi e dalle 10 alle 19:30 il
-- sabato e la domenica (ora di Roma). Fuori orario non scorre: un'opportunita'
-- arrivata alle 23 comincia a contare alle 9 del mattino dopo (alle 10 se e'
-- sabato o domenica). Le feste contano come giorni normali.
--
-- Non c'e' niente da ricalcolare: i tempi si calcolano a ogni lettura, quindi
-- anche i numeri passati (velocita' nelle Opportunita', performance) usano
-- subito il nuovo orario.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

create or replace function crm.minuti_lavoro(p_da timestamptz, p_a timestamptz)
returns numeric
language sql
stable
set search_path = ''
as $$
  select case
    when p_da is null or p_a is null or p_a <= p_da then 0
    else coalesce((
      select sum(greatest(0, extract(epoch from least(p_a, x.fine) - greatest(p_da, x.inizio)) / 60))
        from (select ((g::date + case when extract(isodow from g) >= 6 then time '10:00' else time '09:00' end) at time zone 'Europe/Rome') as inizio,
                     ((g::date + case when extract(isodow from g) >= 6 then time '19:30' else time '21:00' end) at time zone 'Europe/Rome') as fine
                from generate_series((p_da at time zone 'Europe/Rome')::date::timestamp,
                                     (p_a at time zone 'Europe/Rome')::date::timestamp, interval '1 day') g) x), 0)
  end
$$;
