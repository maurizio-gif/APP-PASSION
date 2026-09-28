-- Il mirror di PerfectGym: il club di ogni ingresso, lezione e pagamento
--
-- Sull'istanza passion.perfectgym.com ci sono tre club: Passion Fitness (id 1)
-- e due club finti rimasti da PerfectGym («Gym Europe_...», «Super Line Gym
-- NY_...»), verificato il 28/09/2026: nessun socio, un contratto, nient'altro.
-- Il mirror li copia, perche' e' una copia del gestionale; chi legge filtra sul
-- club 1.
--
-- Per filtrare senza scavare nel JSON, ingressi, lezioni e pagamenti prendono
-- una colonna `club_id` tipizzata e indicizzata, come ce l'hanno gia' i
-- contratti (e i soci, con `home_club_id`).
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

update perfectgym.entita
   set colonne = colonne || '[{"tipo": "bigint", "campo": "clubId", "indice": true, "colonna": "club_id"}]'::jsonb
 where nome in ('MemberClubVisits', 'Classes', 'ContractPayments', 'TransactionPayments')
   and not colonne @> '[{"colonna": "club_id"}]'::jsonb;

select perfectgym.crea_tabella(nome) from perfectgym.entita
 where nome in ('MemberClubVisits', 'Classes', 'ContractPayments', 'TransactionPayments');

-- Le righe gia' scaricate: quelle nuove la colonna la prendono da salva().
update perfectgym.member_club_visits   set club_id = (dati ->> 'clubId')::bigint where club_id is null;
update perfectgym.classes              set club_id = (dati ->> 'clubId')::bigint where club_id is null;
update perfectgym.contract_payments    set club_id = (dati ->> 'clubId')::bigint where club_id is null;
update perfectgym.transaction_payments set club_id = (dati ->> 'clubId')::bigint where club_id is null;
