-- Nome, cognome, email e telefono della persona: se e' un socio, valgono quelli di Perfect Gym
--
-- Prima: la scheda del CRM teneva una sua copia di nome, cognome, email e telefono, scritta
-- alla creazione e mai piu' aggiornata. Chi correggeva l'anagrafica su Perfect Gym vedeva
-- ancora il dato vecchio nella scheda persona, nelle Opportunita', nelle Prove, nei Task,
-- nei Ticket, nel Report giornaliero e nella ricerca (ticket #1060).
--
-- Adesso: quando la persona e' collegata a un socio (member_id), queste schermate mostrano
-- il dato di Perfect Gym; se li' e' vuoto resta quello del CRM. Come gia' fanno Disdette,
-- Rinnovi, Nuovi contratti e Debitori. NON riscrive niente nella tabella public.utenti.
--
-- Funzioni toccate (stessa firma, stesso risultato, cambia solo da dove arrivano i 4 campi):
--   crm_persona, crm_lead, crm_prove, crm_task, crm_cerca, crm_ticket, crm_ticket_elenco,
--   crm_report_giornaliero, crm_iscrizioni.
-- La ricerca (Opportunita' e Cerca) trova la persona sia col dato nuovo sia con quello vecchio.
--
-- Ogni modifica parte dalla definizione che c'e' adesso nel database e controlla che il pezzo
-- da cambiare ci sia una volta sola: se una funzione e' stata cambiata nel frattempo, la
-- migrazione si ferma senza toccare niente (e' tutta in una transazione).
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

do $mig$
declare
  def text;
  volte int;
  -- {funzione, firma, vecchio, nuovo}
  modifiche text[][] := array[
    -- crm_persona: intestazione della scheda (il socio m e' gia' unito)
    array['crm_persona', 'public.crm_persona(uuid)',
      $a$'nome', u.nome, 'cognome', u.cognome, 'email', u.email,$a$,
      $b$'nome', coalesce(nullif(m.nome, ''), u.nome), 'cognome', coalesce(nullif(m.cognome, ''), u.cognome), 'email', coalesce(nullif(m.email, ''), u.email),$b$],
    array['crm_persona', 'public.crm_persona(uuid)',
      $a$'telefono', u.telefono, 'telefono_norm'$a$,
      $b$'telefono', coalesce(nullif(m.telefono, ''), u.telefono), 'telefono_norm'$b$],

    -- crm_lead (Opportunita')
    array['crm_lead', 'public.crm_lead(text, text, text, integer, uuid)',
      $a$select l.id, u.id, u.nome, u.cognome, u.telefono, u.email, u.member_id,$a$,
      $b$select l.id, u.id, coalesce(nullif(pm.nome, ''), u.nome), coalesce(nullif(pm.cognome, ''), u.cognome),
         coalesce(nullif(pm.telefono, ''), u.telefono), coalesce(nullif(pm.email, ''), u.email), u.member_id,$b$],
    array['crm_lead', 'public.crm_lead(text, text, text, integer, uuid)',
      $a$join public.utenti u on u.id = l.utente_id and not crm.cancellata(u.member_id)$a$,
      $b$join public.utenti u on u.id = l.utente_id and not crm.cancellata(u.member_id)
    left join perfectgym.members pm on pm.id = u.member_id$b$],
    array['crm_lead', 'public.crm_lead(text, text, text, integer, uuid)',
      $a$lower(concat_ws(' ', u.nome, u.cognome, u.email, u.telefono, u.telefono_norm))$a$,
      $b$lower(concat_ws(' ', u.nome, u.cognome, u.email, u.telefono, u.telefono_norm, pm.nome, pm.cognome, pm.email, pm.telefono))$b$],

    -- crm_prove
    array['crm_prove', 'public.crm_prove(text, integer, uuid)',
      $a$select p.id, u.id, u.nome, u.cognome, u.telefono, u.email, u.member_id,$a$,
      $b$select p.id, u.id, coalesce(nullif(pm.nome, ''), u.nome), coalesce(nullif(pm.cognome, ''), u.cognome),
         coalesce(nullif(pm.telefono, ''), u.telefono), coalesce(nullif(pm.email, ''), u.email), u.member_id,$b$],
    array['crm_prove', 'public.crm_prove(text, integer, uuid)',
      $a$join public.utenti u on u.id = p.utente_id$a$,
      $b$join public.utenti u on u.id = p.utente_id
    left join perfectgym.members pm on pm.id = u.member_id$b$],

    -- crm_task
    array['crm_task', 'public.crm_task(text, text, integer, uuid)',
      $a$select t.id, u.id, u.nome, u.cognome, u.telefono, t.lead_id, t.prova_id,$a$,
      $b$select t.id, u.id, coalesce(nullif(pm.nome, ''), u.nome), coalesce(nullif(pm.cognome, ''), u.cognome),
         coalesce(nullif(pm.telefono, ''), u.telefono), t.lead_id, t.prova_id,$b$],
    array['crm_task', 'public.crm_task(text, text, integer, uuid)',
      $a$join public.utenti u on u.id = t.utente_id and not crm.cancellata(u.member_id)$a$,
      $b$join public.utenti u on u.id = t.utente_id and not crm.cancellata(u.member_id)
    left join perfectgym.members pm on pm.id = u.member_id$b$],

    -- crm_cerca (la ricerca trova anche per telefono: si guarda quello di Perfect Gym e quello del CRM)
    array['crm_cerca', 'public.crm_cerca(text, integer)',
      $a$select u.id, u.nome, u.cognome, u.email, u.telefono, u.member_id,$a$,
      $b$select u.id, coalesce(nullif(pm.nome, ''), u.nome), coalesce(nullif(pm.cognome, ''), u.cognome),
         coalesce(nullif(pm.email, ''), u.email), coalesce(nullif(pm.telefono, ''), u.telefono), u.member_id,$b$],
    array['crm_cerca', 'public.crm_cerca(text, integer)',
      $a$join lateral (select not crm.cancellata(u.member_id) as visibile) vis on vis.visibile$a$,
      $b$join lateral (select not crm.cancellata(u.member_id) as visibile) vis on vis.visibile
    left join perfectgym.members pm on pm.id = u.member_id$b$],
    array['crm_cerca', 'public.crm_cerca(text, integer)',
      $a$u.telefono_norm like '%' || right(tel, 9) || '%'$a$,
      $b$(u.telefono_norm like '%' || right(tel, 9) || '%' or public.normalizza_telefono(pm.telefono) like '%' || right(tel, 9) || '%')$b$],
    array['crm_cerca', 'public.crm_cerca(text, integer)',
      $a$lower(concat_ws(' ', u.nome, u.cognome, u.email, u.telefono, u.telefono_norm))$a$,
      $b$lower(concat_ws(' ', u.nome, u.cognome, u.email, u.telefono, u.telefono_norm, pm.nome, pm.cognome, pm.email, pm.telefono))$b$],

    -- crm_ticket (scheda del ticket)
    array['crm_ticket', 'public.crm_ticket(bigint)',
      $a$'nome', u.nome, 'cognome', u.cognome, 'member_id', u.member_id,$a$,
      $b$'nome', coalesce(nullif(pm.nome, ''), u.nome), 'cognome', coalesce(nullif(pm.cognome, ''), u.cognome), 'member_id', u.member_id,$b$],
    array['crm_ticket', 'public.crm_ticket(bigint)',
      $a$'telefono', u.telefono, 'email', u.email)$a$,
      $b$'telefono', coalesce(nullif(pm.telefono, ''), u.telefono), 'email', coalesce(nullif(pm.email, ''), u.email))$b$],
    array['crm_ticket', 'public.crm_ticket(bigint)',
      $a$from public.utenti u where u.id = t.utente_id)$a$,
      $b$from public.utenti u left join perfectgym.members pm on pm.id = u.member_id where u.id = t.utente_id)$b$],

    -- crm_ticket_elenco
    array['crm_ticket_elenco', 'public.crm_ticket_elenco(text, uuid)',
      $a$t.utente_id, u.nome, u.cognome, u.member_id,$a$,
      $b$t.utente_id, coalesce(nullif(pm.nome, ''), u.nome), coalesce(nullif(pm.cognome, ''), u.cognome), u.member_id,$b$],
    array['crm_ticket_elenco', 'public.crm_ticket_elenco(text, uuid)',
      $a$left join public.utenti u on u.id = t.utente_id$a$,
      $b$left join public.utenti u on u.id = t.utente_id
      left join perfectgym.members pm on pm.id = u.member_id$b$],

    -- crm_report_giornaliero
    array['crm_report_giornaliero', 'public.crm_report_giornaliero(date, uuid)',
      $a$'nome', u.nome,$a$,
      $b$'nome', coalesce(nullif(pm.nome, ''), u.nome),$b$],
    array['crm_report_giornaliero', 'public.crm_report_giornaliero(date, uuid)',
      $a$'cognome', u.cognome,$a$,
      $b$'cognome', coalesce(nullif(pm.cognome, ''), u.cognome),$b$],
    array['crm_report_giornaliero', 'public.crm_report_giornaliero(date, uuid)',
      $a$'telefono', u.telefono,$a$,
      $b$'telefono', coalesce(nullif(pm.telefono, ''), u.telefono),$b$],
    array['crm_report_giornaliero', 'public.crm_report_giornaliero(date, uuid)',
      $a$'email', u.email)$a$,
      $b$'email', coalesce(nullif(pm.email, ''), u.email))$b$],
    array['crm_report_giornaliero', 'public.crm_report_giornaliero(date, uuid)',
      $a$order by e.ora desc nulls last, u.cognome)$a$,
      $b$order by e.ora desc nulls last, coalesce(nullif(pm.cognome, ''), u.cognome))$b$],
    array['crm_report_giornaliero', 'public.crm_report_giornaliero(date, uuid)',
      $a$left join public.utenti u on u.id = e.utente_id$a$,
      $b$left join public.utenti u on u.id = e.utente_id
    left join perfectgym.members pm on pm.id = u.member_id$b$],

    -- crm_iscrizioni (Contratti senza consulente): qui contava prima il dato del CRM
    array['crm_iscrizioni', 'public.crm_iscrizioni(text, integer)',
      $a$coalesce(u.nome, m.nome), coalesce(u.cognome, m.cognome),$a$,
      $b$coalesce(nullif(m.nome, ''), u.nome), coalesce(nullif(m.cognome, ''), u.cognome),$b$],
    array['crm_iscrizioni', 'public.crm_iscrizioni(text, integer)',
      $a$coalesce(u.telefono, m.telefono), coalesce(u.email, m.email),$a$,
      $b$coalesce(nullif(m.telefono, ''), u.telefono), coalesce(nullif(m.email, ''), u.email),$b$]
  ];
  i int;
  firma text;
  ultima text;
begin
  -- le modifiche sono in ordine per funzione: si applicano tutte alla definizione, poi si ricrea la funzione
  ultima := null;
  for i in 1 .. array_length(modifiche, 1) loop
    firma := modifiche[i][2];
    if ultima is distinct from firma then
      if ultima is not null then
        execute def;
      end if;
      def := pg_get_functiondef(firma::regprocedure);
      ultima := firma;
    end if;
    volte := (length(def) - length(replace(def, modifiche[i][3], ''))) / length(modifiche[i][3]);
    if volte <> 1 then
      raise exception 'Funzione %: il pezzo da cambiare compare % volte (atteso 1): %', modifiche[i][1], volte, modifiche[i][3];
    end if;
    def := replace(def, modifiche[i][3], modifiche[i][4]);
  end loop;
  execute def;
end
$mig$;
