# APP PASSION

Il gestionale di Passion Fitness dentro Supabase. Per ora c'e' la prima parte:
**il mirror di PerfectGym**, cioe' tutto il database di passion.perfectgym.com
copiato nel progetto Supabase **Passion Fitness** (`tihpfycrkjtuppbmcqew`,
eu-west-2 Londra) e tenuto aggiornato. L'app arrivera' dopo, sopra questi dati.

La macchina e' la stessa costruita per Athlon il 28/09/2026 (repo APP-ATHLON,
sezione «Il mirror di PerfectGym» del README e migrazioni `20260928d..l`):
qui e' portata nella sua forma finale, per un progetto nuovo.

## Il mirror di PerfectGym

Vive nello schema `perfectgym`, che PostgREST non espone: dal client non si
legge. Ci scrivono solo le due Edge Function `perfectgym-sync` e
`perfectgym-webhook`, collegate direttamente al database.

### Com'e' fatto

Una tabella per ogni entita' di PerfectGym (`perfectgym.members`,
`perfectgym.contracts`, `perfectgym.contract_payments`...), tutte con la stessa
forma:

| colonna | cosa |
| --- | --- |
| `id` | l'id su PerfectGym (per `member_balances` e' il `memberId`: i saldi un id non ce l'hanno) |
| `version` | il contatore di PerfectGym, che cresce a ogni modifica |
| `is_deleted` | le righe cancellate su PerfectGym restano qui, segnate |
| `dati` | la riga intera com'e' arrivata dall'API |
| le altre | i campi che servono a cercare e a unire, gia' tipizzati: `member_id`, `contract_id`, `data_inizio`, `importo`, `club_id`... |

Cosa scaricare e con quali colonne lo dice **`perfectgym.entita`**, non il
codice: una riga per entity set, con la tabella, il campo che fa da cursore, le
colonne tipizzate e ogni quanti minuti ricontrollarla. Aggiungere un'entita' e'
un `insert` li' e un `select perfectgym.crea_tabella('Nome')`.

| tabella di servizio | cosa |
| --- | --- |
| `sync_stato` | per ogni entita': fase (`iniziale` / `delta`), cursore, righe lette, ultimo errore |
| `sync_log` | una riga per pagina scaricata; si svuota oltre i 30 giorni |
| `sync_lucchetto` | un giro alla volta; scade da solo se una chiamata muore a meta' |
| `webhook_eventi` | ogni evento arrivato da PerfectGym |

### Cosa c'e' dentro, e cosa no

Lo Swagger di PerfectGym API 2.2 ha 129 entity set. La sonda
(`perfectgym-probe?test=catalogo`) li ha provati tutti il 28/09/2026: tutti
rispondono. Il mirror ne scarica **118**, piu' `MemberLevels` (i soci con i
loro livelli, letti da `Members`), anche quelli oggi vuoti: si riempiranno da
soli quando Passion comincera' a usarli.

Restano fuori, di proposito:

| entity set | perche' |
| --- | --- |
| `Cities` | 2,3 milioni di righe senza `version`: il dizionario mondiale delle citta' di PerfectGym, non un dato di Passion |
| `ClubTranslations`, `ClubEquipmentTranslations`, `ClubFacilityTranslations`, `EmployeePositionTranslations`, `EmployeeTranslations`, `PaymentPlanTranslations`, `MemberAgreementTranslations` | non hanno un `id` (la chiave e' entita' + lingua): sono i nomi tradotti di cose che il mirror ha gia' |
| `EPaymentKeys` | le chiavi dei pagamenti elettronici: nessun uso, e non conviene tenerne una copia |
| `MemberBiometricData` | dati biometrici; oggi vuota, non si copia |
| `MembersInClub` | il contatore di chi e' in sala adesso, una riga che cambia a ogni ingresso; chi e' dentro si ricava da `MemberClubVisits` |

**Tre club, uno vero.** Sull'istanza ci sono Passion Fitness (id 1) e due club
finti rimasti da PerfectGym («Gym Europe_...», «Super Line Gym NY_...»):
nessun socio, un contratto, nient'altro. Il mirror li copia perche' e' una
copia del gestionale; chi legge filtra su `club_id = 1`. Per farlo senza
scavare nel JSON, ingressi, lezioni e pagamenti hanno una colonna `club_id`
tipizzata come i contratti (i soci hanno `home_club_id`).

### Come si scarica

L'Edge Function **`perfectgym-sync`** gira ogni minuto (pg_cron, job
`perfectgym-sync`) e per ogni entita' chiede le righe successive al suo
cursore:

```
GET /odata/Members?$filter=version gt <cursore>&$orderby=version
```

- **Niente `$top`, niente `$skip`.** Senza `$top` l'API manda 500 righe e un
  `@odata.nextLink`; la pagina dopo riparte dall'ultimo `version` letto, che non
  si sposta se una riga cambia durante il download.
- **Lo stesso cursore fa il download e il delta.** Arrivata in fondo l'entita'
  passa in fase `delta`, e ogni `intervallo_minuti` lo stesso filtro porta solo
  cio' che e' cambiato: 2 minuti per soci, contratti e pagamenti, 5-10 per le
  attivita' quotidiane, 60 per i dizionari.
- **Le entita' senza `version`** (`Crm2Leads`, `Crm2Events`,
  `MemberAgreementAnswers`, `MemberCustomAttributes`, `InvoiceItems` e i
  dizionari) si leggono per `id`: le righe nuove arrivano a ogni intervallo, e
  ogni `riscansione_ore` si rileggono da capo per vedere le modifiche.
- **Fino a quattro download insieme**, dopo i controlli rapidi delle entita' gia'
  complete.
- **`perfectgym.salva()` e' l'unico punto che scrive.** Una riga arrivata due
  volte nella stessa pagina diventa una, e una riga non si sovrascrive mai con
  una `version` piu' vecchia: sync e webhook scrivono sulle stesse righe.

Per sapere a che punto e':

```sql
select entita, fase, righe_lette, ultimo_giro_il, ultimo_errore
  from perfectgym.sync_stato order by entita;
```

### I webhook di PerfectGym

Il polling basta a non perdere niente, ma arriva con qualche minuto di
ritardo; i webhook arrivano quando la cosa succede. Su PerfectGym (Pgm ->
Webhooks) e' registrato, dal 28/09/2026, un webhook **SUPABASE** con tutti e
dodici gli eventi, che punta all'Edge Function **`perfectgym-webhook`** con un
token in query string:

```
https://tihpfycrkjtuppbmcqew.supabase.co/functions/v1/perfectgym-webhook?t=<token>
```

PerfectGym non firma le chiamate: il token nell'URL e' l'unica protezione e va
trattato come una password. Sta nel Vault, non in questo file:

```sql
select decrypted_secret from vault.decrypted_secrets where name = 'perfectgym_webhook_token';
```

L'evento e' un campanello, non la verita': la funzione lo scrive in
`perfectgym.webhook_eventi` cosi' com'e', risponde 200 e in background rilegge
da PerfectGym le righe che tocca:

| evento | cosa si rilegge |
| --- | --- |
| `ContractCreated` | il contratto e il socio |
| `ContractPaymentDone` | gli ultimi 20 pagamenti del contratto, il contratto, il saldo del socio |
| `UserModified` | socio, attributi personalizzati, consensi, saldo, relazioni familiari |
| `AgreementAnswerModified` | i consensi del socio |
| `UserPresenceChanged` | gli ultimi 5 accessi e le ultime 10 prenotazioni del socio |
| `ClassesBooked`, `…OnStandbyList`, `…Cancelled`, `…PromotedFromStandbyList` | la lezione e la prenotazione del socio |
| `PersonalTrainingBooked`, `…Cancelled` | la prenotazione del PT, con i dettagli |
| `UserCardScanned` | niente: non c'e' un'entita' OData, **l'evento e' l'unica traccia** di una tessera passata al tornello, anche quando l'accesso e' negato |

PerfectGym ripete una consegna finche' non riceve un 200: l'`hash` del corpo e'
unico e la ripetizione si ferma li'. Una rilettura che fallisce resta con
`stato = 'errore'` e il job `perfectgym-webhook-coda` la riprova ogni minuto,
fino a cinque volte. Nel primo minuto dal vivo: 11 eventi di sei tipi, tutti
riletti al primo tentativo, fra 0,06 e 0,8 secondi dall'arrivo.

### Segreti, cron e deploy

| cosa | dove |
| --- | --- |
| `PERFECTGYM_CLIENT_ID`, `PERFECTGYM_CLIENT_SECRET` | secret delle Edge Function (dashboard Supabase -> Edge Functions -> Secrets) |
| `PERFECTGYM_URL` | facoltativo: di default `https://passion.perfectgym.com/Api/v2.2` |
| `perfectgym_sync_token` | Vault: con questo pg_cron chiama le funzioni. Generato dal database |
| `perfectgym_sync_anon` | Vault: la chiave anon, che serve solo a passare il gateway di `perfectgym-sync`. Creata a mano, non in una migrazione |
| `perfectgym_webhook_token` | Vault: il token nell'URL registrato su PerfectGym |

I job di pg_cron: `perfectgym-sync` e `perfectgym-webhook-coda` ogni minuto,
`perfectgym-sync-pulizia-log` alle 3:17 UTC. Le funzioni stanno in
`supabase/functions/` e, come le migrazioni in `supabase/migrations/`, si
pubblicano a mano (CLI o MCP di Supabase): il file nel repo e' la versione di
riferimento. La sonda `perfectgym-probe` e' di sola lettura e si chiama con il
token del sync o con una chiave segreta.

### Il primo download, 28/09/2026

Partito alle 15:34 UTC, finito alle 15:58: circa 1,4 milioni di righe su 119
entita', senza un errore. Le piu' grandi sono gli accessi al club (359.000) e
le prenotazioni delle lezioni (185.000).

**Il disco.** Alle 15:46 il progetto e' passato in sola lettura
(`default_transaction_read_only = on`, impostato dalla piattaforma): e' la
protezione di Supabase quando il disco supera il 95%, e il disco di un progetto
nuovo era piccolo per il download — 848 MB di dati piu' il WAL della scrittura
in blocco. I job di pg_cron sono stati spenti (`cron.alter_job(jobid, active :=
false)`), il disco allargato da Settings -> Compute and Disk, i job riaccesi:
il download e' ripartito dal suo cursore senza perdere niente. Se succede di
nuovo si fa lo stesso; per scrivere mentre il progetto e' in sola lettura serve
`set session characteristics as transaction read write;` nella stessa sessione.

**La verifica.** A download finito, `$count` di PerfectGym contro le righe del
mirror, entita' per entita': 112 su 118 identiche. Le altre sei:

- `MemberCards` (-194) e `Crm2Leads` (-92): come su Athlon, e' `$count` di
  PerfectGym a contare le righe che l'API restituisce doppie. Sugli id distinti
  (sonda, `?test=verifica`) i numeri coincidono: 913 tessere, 29.048 lead;
- accessi, prenotazioni e pagamenti (-2, -2, -13): attivita' degli ultimi
  minuti. Con `?test=mancanti` si vedono gli id che mancano e la loro
  `version`, piu' alta del cursore: sono arrivati al giro dopo (i 13 pagamenti,
  registrati alle 16:05, erano nel mirror alle 16:07).
