-- Ticket: R2D (superadmin) vede un ticket solo da quando e' stato inviato a
-- R2D. Finche' e' in gestione al supporto (da verificare, o chiuso al desk
-- senza mai passare da R2D) non lo vede, ne' nell'elenco, ne' nei numeri, ne'
-- aprendolo per numero. Una volta inviato vede tutto lo storico (filo,
-- allegati). Restano visibili a R2D le modifiche e i ticket aperti da lui.
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

create or replace function public.crm_ticket_elenco(p_vista text default 'da_verificare', p_utente uuid default null)
returns table (id bigint, tipo text, stato text, titolo text, bloccante boolean,
               utente_id uuid, nome text, cognome text, member_id bigint,
               aperto_da_nome text, aperto_il timestamptz, preso_nome text, aggiornato_il timestamptz,
               chiuso_il timestamptz, natura text, dal date, riunione date, doppione_di bigint,
               messaggi int, allegati int, ultimo_lato text)
language plpgsql stable security definer set search_path = ''
as $$
declare me uuid := crm.ticket_richiedi(null);
begin
  return query
    select t.id, t.tipo, t.stato, t.titolo, t.bloccante,
           t.utente_id, u.nome, u.cognome, u.member_id,
           crm.nome_staff(t.aperto_da), t.aperto_il, crm.nome_staff(t.preso_da), t.aggiornato_il,
           t.chiuso_il, t.natura, t.dal, t.riunione, t.doppione_di,
           (select count(*)::int from public.ticket_messaggi m where m.ticket_id = t.id and m.testo is not null),
           (select count(*)::int from public.ticket_allegati a where a.ticket_id = t.id),
           (select m.lato from public.ticket_messaggi m where m.ticket_id = t.id and m.testo is not null
             order by m.creato_il desc limit 1)
      from public.ticket t
      left join public.utenti u on u.id = t.utente_id
     where (not crm.e_superadmin() or t.tipo = 'modifica' or t.inviato_il is not null or t.aperto_da = me) and case
             when p_utente is not null then t.utente_id = p_utente
             when p_vista = 'da_verificare' then t.stato = 'da_verificare'
             when p_vista = 'r2d' then t.stato in ('inviato', 'in_lavorazione')
             when p_vista = 'in_attesa' then t.stato = 'in_attesa'
             when p_vista = 'modifiche' then t.stato in ('da_confermare', 'confermata')
             when p_vista = 'miei' then t.aperto_da = me
                                        and t.stato not in ('risolto', 'risolto_desk', 'doppione', 'rilasciata', 'annullata')
             when p_vista = 'chiusi' then t.stato in ('risolto', 'risolto_desk', 'doppione', 'rilasciata', 'annullata')
                                          and t.chiuso_il >= now() - interval '90 days'
             when p_vista = 'tutti' then true
             else false
           end
     order by case when p_vista = 'chiusi' then t.chiuso_il end desc nulls last,
              case when p_utente is not null or p_vista = 'tutti' then t.aperto_il end desc nulls last,
              t.bloccante desc, t.aperto_il
     limit 300;
end;
$$;

create or replace function public.crm_ticket(p_id bigint)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare me uuid := crm.ticket_richiedi(null);
        t public.ticket;
begin
  select * into t from public.ticket where id = p_id;
  if t.id is null or not (not crm.e_superadmin() or t.tipo = 'modifica' or t.inviato_il is not null or t.aperto_da = me) then
    return null;
  end if;
  return to_jsonb(t) || jsonb_build_object(
    'aperto_da_nome', crm.nome_staff(t.aperto_da),
    'aperto_da_lato', crm.ticket_lato(t.aperto_da),
    'inviato_nome', crm.nome_staff(t.inviato_da),
    'preso_nome', crm.nome_staff(t.preso_da),
    'chiuso_nome', crm.nome_staff(t.chiuso_da),
    'confermata_nome', crm.nome_staff(t.confermata_da),
    'persona', (select jsonb_build_object('id', u.id, 'nome', u.nome, 'cognome', u.cognome, 'member_id', u.member_id,
                                          'telefono', u.telefono, 'email', u.email)
                  from public.utenti u where u.id = t.utente_id),
    'messaggi', coalesce((select jsonb_agg(jsonb_build_object(
                    'id', m.id, 'testo', m.testo, 'evento', m.evento, 'lato', m.lato,
                    'autore', crm.nome_staff(m.autore), 'creato_il', m.creato_il) order by m.creato_il, m.id)
                  from public.ticket_messaggi m where m.ticket_id = t.id), '[]'),
    'allegati', coalesce((select jsonb_agg(jsonb_build_object(
                    'id', a.id, 'percorso', a.percorso, 'nome', a.nome, 'tipo', a.tipo, 'dimensione', a.dimensione,
                    'messaggio_id', a.messaggio_id, 'caricato_nome', crm.nome_staff(a.caricato_da),
                    'caricato_il', a.caricato_il) order by a.caricato_il, a.id)
                  from public.ticket_allegati a where a.ticket_id = t.id), '[]'),
    -- I ticket uniti a questo, e gli altri aperti sulla stessa persona.
    'doppioni', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'titolo', d.titolo,
                                                              'aperto_da_nome', crm.nome_staff(d.aperto_da),
                                                              'aperto_il', d.aperto_il) order by d.aperto_il)
                  from public.ticket d where d.doppione_di = t.id
                   and (not crm.e_superadmin() or d.inviato_il is not null or d.aperto_da = me)), '[]'),
    'stessa_persona', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'titolo', o.titolo, 'stato', o.stato)
                                                 order by o.aperto_il desc)
                  from public.ticket o
                 where t.utente_id is not null and o.utente_id = t.utente_id and o.id <> t.id
                   and (not crm.e_superadmin() or o.tipo = 'modifica' or o.inviato_il is not null or o.aperto_da = me)
                   and o.stato not in ('risolto', 'risolto_desk', 'doppione', 'rilasciata', 'annullata')), '[]'));
end;
$$;

create or replace function public.crm_ticket_conti()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare me uuid := crm.ticket_richiedi(null);
begin
  return (
    select jsonb_build_object(
      'da_verificare', count(*) filter (where stato = 'da_verificare'),
      'proposte', count(*) filter (where stato = 'da_verificare' and tipo = 'proposta'),
      'r2d', count(*) filter (where stato in ('inviato', 'in_lavorazione')),
      'in_attesa', count(*) filter (where stato = 'in_attesa'),
      'bloccanti', count(*) filter (where bloccante and stato in ('da_verificare', 'inviato', 'in_lavorazione', 'in_attesa')),
      'miei', count(*) filter (where aperto_da = me
                                 and stato not in ('risolto', 'risolto_desk', 'doppione', 'rilasciata', 'annullata')),
      'modifiche_da_confermare', count(*) filter (where stato = 'da_confermare'),
      'modifiche_da_rilasciare', count(*) filter (where stato = 'confermata'))
      from public.ticket t
       where (not crm.e_superadmin() or t.tipo = 'modifica' or t.inviato_il is not null or t.aperto_da = me));
end;
$$;
