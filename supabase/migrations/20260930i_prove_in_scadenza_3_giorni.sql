-- Prove in scadenza: entro 3 giorni
--
-- «In scadenza» (la vista delle Prove e il riquadro della home) sono le prove
-- aperte il cui pass finisce oggi o nei prossimi 3 giorni: prima erano 2, ora
-- sono 3.
--
-- I giorni che mancano (`giorni_rimasti` di crm_prove) si contano sul
-- calendario di Roma: 0 il pass finisce oggi, 1 domani. Prima si contavano le
-- ore fino alla fine del pass, che finisce alle 23:59: quello di oggi risultava
-- «1 gg», e in home «domani».
--
-- La telefonata di fine prova (crm.task_fine_prova()) resta a due giorni dalla
-- fine.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

do $$
declare
  def text;
  nuova text;
  vecchio text;
  scadenza text := $s$(p.data_fine at time zone 'Europe/Rome')::date between (now() at time zone 'Europe/Rome')::date
                                                                           and (now() at time zone 'Europe/Rome')::date + 3$s$;
begin
  -- La vista delle Prove.
  def := pg_get_functiondef('public.crm_prove(text,integer,uuid)'::regprocedure);
  vecchio := $a$when 'in_scadenza' then p.esito is null and p.data_fine between now() and now() + interval '2 days'$a$;
  if (length(def) - length(replace(def, vecchio, ''))) / length(vecchio) <> 1 then
    raise exception 'crm_prove: in_scadenza non trovato una volta sola';
  end if;
  nuova := replace(def, vecchio, $b$when 'in_scadenza' then p.esito is null and p.data_fine >= now() and $b$ || scadenza);
  vecchio := $a$case when p.data_fine is not null then ceil(extract(epoch from p.data_fine - now()) / 86400)::int end$a$;
  if (length(nuova) - length(replace(nuova, vecchio, ''))) / length(vecchio) <> 1 then
    raise exception 'crm_prove: giorni_rimasti non trovato una volta sola';
  end if;
  nuova := replace(nuova, vecchio,
                   $b$((p.data_fine at time zone 'Europe/Rome')::date - (now() at time zone 'Europe/Rome')::date)$b$);
  execute nuova;

  -- Il riquadro della home.
  def := pg_get_functiondef('public.crm_home()'::regprocedure);
  vecchio := $a$'prove_in_scadenza', (select count(*) from public.prove where esito is null and data_fine between now() and now() + interval '2 days')$a$;
  if (length(def) - length(replace(def, vecchio, ''))) / length(vecchio) <> 1 then
    raise exception 'crm_home: prove_in_scadenza non trovato una volta sola';
  end if;
  execute replace(def, vecchio,
                  $b$'prove_in_scadenza', (select count(*) from public.prove p where p.esito is null and p.data_fine >= now() and $b$
                  || scadenza || ')');
end;
$$;
