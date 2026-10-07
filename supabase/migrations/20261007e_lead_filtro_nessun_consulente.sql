-- Lead: il filtro consulente ha anche «Nessun consulente»
--
-- `crm_lead(p_consulente)` con l'uuid tutto a zero mostra i lead senza
-- consulente (assegnato_a vuoto); con un uuid vero, quelli del consulente.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

do $$
declare
  def text;
  vecchio text := $a$(p_consulente is null or l.assegnato_a = p_consulente)$a$;
begin
  def := pg_get_functiondef('public.crm_lead(text,text,text,integer,uuid)'::regprocedure);
  if (length(def) - length(replace(def, vecchio, ''))) / length(vecchio) <> 1 then
    raise exception 'crm_lead: filtro consulente non trovato una volta sola';
  end if;
  execute replace(def, vecchio, $b$(p_consulente is null
            or (p_consulente = '00000000-0000-0000-0000-000000000000'::uuid and l.assegnato_a is null)
            or l.assegnato_a = p_consulente)$b$);
end;
$$;
