-- L'appello non porta all'anagrafica del cliente
--
-- Nell'Appello complessivo il nome di chi ha prenotato apriva la sua scheda
-- persona. Non piu': dall'appello l'anagrafica non si apre, e il database non
-- manda nemmeno piu' l'id della persona (`utente_id`) con i prenotati.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

do $$
declare
  def text := pg_get_functiondef('public.crm_appello_tutte(date, bigint, bigint, bigint, bigint)'::regprocedure);
  vecchio text := 'crm.appello_lezioni(da, a, null, p_istruttore, p_lezione, p_categoria, p_sala, true)';
  nuovo text := 'crm.appello_lezioni(da, a, null, p_istruttore, p_lezione, p_categoria, p_sala, false)';
begin
  if (length(def) - length(replace(def, vecchio, ''))) / length(vecchio) <> 1 then
    raise exception 'crm_appello_tutte: chiamata non trovata una volta sola';
  end if;
  execute replace(def, vecchio, nuovo);
end;
$$;
