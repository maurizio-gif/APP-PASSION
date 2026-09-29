-- Task da Airtable: niente piu' Richiamare e Appuntamento per i nuovi
--
-- «Richiamare» e «Appuntamento» non si scelgono piu' per i task nuovi:
-- erano doppioni di Telefonata e In sede, che si programmano o si registrano.
-- Il sync da Airtable (`airtable.allinea_task`, 20260929b) metteva
-- «Richiamare» a ogni task senza «Tipologia di Task» (o con una sconosciuta),
-- e «Appuntamento» a quelli con Tipologia Appuntamento. Da qui:
--   - un task nuovo senza tipologia riconosciuta nasce Telefonata, uno con
--     Appuntamento nasce In sede;
--   - un task gia' nel CRM tiene il suo tipo se su Airtable non ne ha uno
--     riconosciuto (i «Richiamare» e gli «Appuntamento» dello storico restano).
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

do $$
declare
  def text := pg_get_functiondef('airtable.allinea_task(text,jsonb,timestamptz)'::regprocedure);
  nuova text := def;
  sostituzioni text[][] := array[
    array[$a$when 'EMAIL' then 'email' when 'Appuntamento' then 'appuntamento' else 'richiamare' end;$a$,
          $b$when 'EMAIL' then 'email' when 'Appuntamento' then 'appuntamento' end;$b$],
    array[$a$values (u, lid, v_tipo, $a$,
          $b$values (u, lid, case v_tipo when 'appuntamento' then 'in_sede' else coalesce(v_tipo, 'telefonata') end, $b$],
    array[$a$tipo = v_tipo,$a$, $b$tipo = coalesce(v_tipo, tipo),$b$]
  ];
  i int;
begin
  for i in 1 .. array_length(sostituzioni, 1) loop
    if position(sostituzioni[i][1] in nuova) = 0 then
      raise exception 'allinea_task: testo da sostituire non trovato: %', sostituzioni[i][1];
    end if;
    nuova := replace(nuova, sostituzioni[i][1], sostituzioni[i][2]);
  end loop;
  execute nuova;
end;
$$;
