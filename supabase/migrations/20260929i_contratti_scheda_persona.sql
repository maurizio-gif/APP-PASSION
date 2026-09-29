-- Scheda persona: i contratti con tutti i dettagli
--
-- Con «Nuovi contratti» sospesa (lib/permessi.ts), nella scheda persona al
-- posto dei riquadri «Nuovo contratto · Controllato» ci sono i contratti di
-- PerfectGym, uno per riquadro: nome del piano, stato, firma, inizio, fine,
-- disdetta, canone. Qui `crm_persona()` aggiunge ai contratti quello che
-- mancava: se e' un contratto aggiuntivo, il rinnovo automatico e il giorno
-- dell'addebito ricorrente.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

do $$
declare
  def text := pg_get_functiondef('public.crm_persona(uuid)'::regprocedure);
  vecchio text := $v$'data_disdetta', c.data_disdetta)$v$;
  nuova text := replace(def, vecchio,
    $n$'data_disdetta', c.data_disdetta, 'aggiuntivo', c.aggiuntivo, 'rinnovo_automatico', c.rinnovo_automatico,
            'giorno_addebito', (c.dati ->> 'recurringPaymentDay')::int)$n$);
begin
  if nuova = def then raise exception 'crm_persona: testo da sostituire non trovato'; end if;
  execute nuova;
end;
$$;
