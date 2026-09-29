-- Scheda persona riordinata: abbonamenti, certificato medico, accessi, prenotazioni
--
-- Nella scheda persona:
--   - fra gli abbonamenti non ci sono piu' i certificati. Su PerfectGym il
--     certificato e' un contratto aggiuntivo a canone zero («Certificato
--     Medico», «Certificato Temporaneo»), ma non e' un abbonamento. In cima
--     resta l'abbonamento in corso (fra quelli in corso, il non aggiuntivo),
--     gli altri si aprono sotto;
--   - il certificato si legge dai custom attribute del socio
--     (`perfectgym.member_custom_attributes`, nel mirror): 20 «Inizio Validita'
--     Certificato Medico», 21 «Scadenza Certificato Medico», 23 e 24 inizio e
--     termine del Certificato Medico Temporaneo. Il 29/09/2026 li avevano
--     3.543 soci (medico) e 5.788 (temporaneo); le date coincidono con quelle
--     del contratto «Certificato Medico» in 2.754 casi su 2.822;
--   - gli ultimi 10 accessi e le ultime 10 prenotazioni (erano 15), con la
--     lista d'attesa.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

do $$
declare
  def text := pg_get_functiondef('public.crm_persona(uuid)'::regprocedure);
  nuova text := def;
  prima text;
begin
  -- Il certificato, accanto al saldo.
  prima := nuova;
  nuova := replace(nuova, $a$'saldo', (select b.saldo from perfectgym.member_balances b where b.id = m.id),$a$,
    $b$'saldo', (select b.saldo from perfectgym.member_balances b where b.id = m.id),
       'certificato', (select jsonb_build_object(
            'inizio', left(max(a.valore) filter (where a.definition_id = 20), 10),
            'scadenza', left(max(a.valore) filter (where a.definition_id = 21), 10),
            'temporaneo_inizio', left(max(a.valore) filter (where a.definition_id = 23), 10),
            'temporaneo_fine', left(max(a.valore) filter (where a.definition_id = 24), 10))
          from perfectgym.member_custom_attributes a
         where a.member_id = m.id and not a.is_deleted and a.definition_id in (20, 21, 23, 24)),$b$);
  if nuova = prima then raise exception 'crm_persona: saldo non trovato'; end if;

  -- Gli abbonamenti: senza i certificati, prima quello in corso (fra quelli in
  -- corso il non aggiuntivo), poi dal piu' recente.
  prima := nuova;
  nuova := replace(nuova, $a$order by (c.stato = 'Current') desc, c.data_inizio desc)$a$,
                          $b$order by (c.stato = 'Current') desc, (c.stato = 'Current' and coalesce(c.aggiuntivo, false)),
                     c.data_inizio desc)$b$);
  if nuova = prima then raise exception 'crm_persona: ordine dei contratti non trovato'; end if;
  prima := nuova;
  nuova := replace(nuova, $a$where c.member_id = m.id and not c.is_deleted and c.club_id = 1)$a$,
                          $b$where c.member_id = m.id and not c.is_deleted and c.club_id = 1
           and coalesce(pp.nome, '') not ilike 'certificato%')$b$);
  if nuova = prima then raise exception 'crm_persona: filtro dei contratti non trovato'; end if;

  -- Gli ultimi 10 accessi.
  prima := nuova;
  nuova := replace(nuova, 'order by v.entrata desc limit 15) v', 'order by v.entrata desc limit 10) v');
  if nuova = prima then raise exception 'crm_persona: ingressi non trovati'; end if;

  -- Le ultime 10 prenotazioni, con la lista d'attesa.
  prima := nuova;
  nuova := replace(nuova, 'order by b.id desc limit 15) b', 'order by b.id desc limit 10) b');
  if nuova = prima then raise exception 'crm_persona: prenotazioni non trovate'; end if;
  prima := nuova;
  nuova := replace(nuova, $a$'annullata', b.annullata, 'presente', b.presente)$a$,
                          $b$'annullata', b.annullata, 'presente', b.presente, 'in_attesa', b.in_attesa)$b$);
  if nuova = prima then raise exception 'crm_persona: stato delle prenotazioni non trovato'; end if;

  execute nuova;
end;
$$;
