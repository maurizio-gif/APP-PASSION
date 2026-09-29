-- Scheda persona: un task si programma o si registra
--
-- «Nuovo task» nella scheda persona ha due strade:
--   - Programma: un task da fare, con la data scelta e le note di
--     preparazione (`nota`), come finora (`crm_task_nuovo`);
--   - Registra: una cosa gia' fatta (una telefonata appena finita, un
--     WhatsApp mandato): nasce fatta adesso, data e ora sono quelle del
--     momento e non si scelgono, con l'esito e le note dell'esito
--     (`esito`, `nota_esito`), come un task chiuso con `crm_task_completa`.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

create or replace function public.crm_task_registra(p_utente uuid, p_tipo text, p_esito text, p_nota_esito text default null,
                                                    p_assegnato uuid default null, p_lead uuid default null)
returns uuid
language plpgsql volatile security definer set search_path = ''
as $$
declare me uuid := crm.chi(); t uuid;
begin
  if p_esito not in ('positivo', 'negativo') then
    raise exception 'Scegli l''esito: positivo o negativo';
  end if;
  insert into public.task (utente_id, lead_id, tipo, data, assegnato_a, creato_da, completato_il, esito, nota_esito)
  values (p_utente, p_lead, p_tipo, now(), coalesce(p_assegnato, me), me, now(), p_esito,
          nullif(trim(coalesce(p_nota_esito, '')), ''))
  returning id into t;
  update public.utenti set aggiornato_il = now() where id = p_utente;
  return t;
end;
$$;

revoke all on function public.crm_task_registra(uuid, text, text, text, uuid, uuid) from public, anon;
grant execute on function public.crm_task_registra(uuid, text, text, text, uuid, uuid) to authenticated;
