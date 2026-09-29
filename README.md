# APP PASSION

Il gestionale di Passion Fitness dentro Supabase, in tre pezzi:
**il mirror di PerfectGym** (tutto il database di passion.perfectgym.com
copiato nel progetto Supabase **Passion Fitness**, `tihpfycrkjtuppbmcqew`,
eu-west-2 Londra, e tenuto aggiornato), **il CRM** (il lavoro degli operatori,
migrato da Airtable) e **l'app** per lo staff, su https://crm.passionfitness.it (anche crm-passion.vercel.app).

La macchina e' la stessa costruita per Athlon il 28/09/2026 (repo APP-ATHLON,
sezione «Il mirror di PerfectGym» del README e migrazioni `20260928d..l`):
qui e' portata nella sua forma finale, per un progetto nuovo.

## Il CRM, e da dove viene

Lo schema e' quello deciso nella riunione del 28/09/2026: pochi contenitori,
ognuno col suo lavoro. Sta in `public`, con la RLS accesa e nessuna policy:
dal client non si legge niente, l'app passa solo dalle funzioni `crm_*`. I dati di PerfectGym
(contratti, date, pagamenti, ingressi) non si copiano: si leggono dal mirror
per `member_id` e `contract_id`. Qui sta il lavoro degli operatori.

| tabella | cosa |
| --- | --- |
| `utenti` | una persona sola, riconosciuta dall'email o dal telefono normalizzato (`+393331234567`, qualunque sia la scrittura), agganciata al socio del mirror |
| `staff` | gli operatori, admin o consulenti; chi non c'e' piu' resta con `attivo = false`. Si inseriscono a mano (vedi `20260928f`): nomi ed email non stanno nel repository, che e' pubblico |
| `lead` | chi arriva: fonte (sito, tour, referral, meta, altro) e dettaglio; fasi `da_gestire` -> `in_gestione` (assegnato) -> `vinta`/`persa` |
| `prove` | i pass attivati, con la scadenza e l'esito (iscritto / non iscritto) |
| `nuovi_contratti` | i controlli su ogni contratto nuovo: metodo di pagamento, codice fiscale, tesseramento |
| `disdette` | chi disdice, com'e' stato contattato, com'e' finita |
| `commenti`, `task` | il lavoro sulle persone; i task sono assegnabili a un altro operatore |
| `rinnovi` | gli abbonamenti in scadenza da rinnovare, con chi li segue e l'esito (dal 29/09/2026, `20260929b`) |
| `debiti` | i soci in negativo su PerfectGym e chi segue il recupero (`20260929a`) |

Customer Care per ora resta fuori, per scelta.

### La migrazione da Airtable

In due tempi. **La copia**: il workflow n8n «PASSION: Airtable -> Supabase
(import CRM)» (`mVLX3FPqcVtxZgpx`, lancio a mano, solo letture) porta ogni
record della base CRM PASSION FITNESS nello schema `airtable` (tabella
`airtable.record`, i campi cosi' come li da' l'API) attraverso l'Edge
Function `airtable-atterraggio`. **La ricostruzione**:
`select airtable.ricostruisci_crm();` svuota il CRM e lo rifa' dalla copia
con le regole scritte in `20260928g`. Si rilancia quanto si vuole finche' il
CRM non e' dal vivo; poi si rifiuta da sola, appena nel CRM c'e' una riga nata
nel CRM.

Il 28/09/2026: 46.599 record copiati, e nel CRM 7.414 persone (6.884 col socio
di PerfectGym), 5.159 lead (tour 2.035, meta 1.219, sito 1.159, referral 712,
altro 34), 1.609 prove, 2.325 nuovi contratti, 2.001 disdette, 21.716 commenti,
13.949 task. Quello che manca ha un motivo: task e commenti delle 26
opportunita' di test o senza contatto; 109 nuovi contratti senza ContractID
che nel mirror non si trovano (41 con un numero socio inesistente, 32 doppioni,
28 senza un contratto firmato in quei giorni, 8 cancellati su PerfectGym).

Due cose che non si vedono da Airtable:

- **chi arriva dal sito non e' un Lead ma un Pass.** Il modulo attiva subito
  la prova, e l'opportunita' nasce di tipo Pass (1.300 su 1.363). Nel CRM ne
  nascono un lead gia' vinto con esito prova, e la prova agganciata;
- **l'import si fa una connessione alla volta.** Il primo lancio teneva un
  pool aperto per ogni istanza della funzione: 72 connessioni in due minuti,
  database pieno, mirror fermo. Ora la funzione apre e chiude una connessione
  per chiamata. Durante l'import il mirror e' stato messo in pausa e poi
  riacceso.

### Il CRM dal vivo (`20260928h`)

Dal 28/09/2026 alle 16:44 UTC (`crm.impostazioni.dal_vivo_dal`) il CRM si
alimenta da solo: il cron `crm-alimenta`, ogni 5 minuti, lancia
`crm.alimenta()` (esiti in `crm.alimenta_log`), che fa:

- **nuovi lead da Airtable**: i record creati dopo quell'ora (Tour e Meta
  scrivono ancora li') diventano lead. Serve che il workflow di import giri a
  orario. Se la stessa persona e' gia' arrivata dai moduli nella mezz'ora, il
  record si aggancia a quel lead invece di farne un secondo;
- **nuovi contratti** dal mirror: ogni contratto firmato che non e' un Pass;
- **disdette** dal mirror: un contratto a cui compare la `data_disdetta`. Non
  il rinnovo automatico spento, come ad Athlon: a Passion e' spento su tutti i
  contratti. Le disdette gia' note sono in `crm.disdette_note`;
- **prove** dal mirror: ogni Pass (piano che contiene pass, prova o guest);
- **task di fine prova**: due giorni prima della scadenza, a chi segue la prova.

### Airtable -> CRM, di continuo (`20260929b`)

Il CRM e' dal vivo, ma lo staff lavora ancora anche su Airtable (task, stati,
assegnazioni, controlli dei nuovi contratti), e Tour e Meta scrivono i lead
solo li'. Finche' Airtable resta acceso, il CRM lo segue:

- **il trasporto**: il workflow n8n «PASSION: Airtable -> Supabase (sync CRM)»
  (`mVLX3FPqcVtxZgpx`) ogni 5 minuti porta in `airtable.record` i record
  modificati nell'ultima ora (`filterByFormula` su `LAST_MODIFIED_TIME()`),
  ogni notte alle 3:40 li riporta tutti; il lancio a mano rilegge tutto.
  `airtable.salva()` scrive solo i record cambiati e li segna da applicare
  (`applicato_il` vuoto);
- **l'applicazione**: `airtable.allinea()`, dentro `crm.alimenta()`, porta nel
  CRM i record da applicare con le regole della ricostruzione: lead nuovi,
  stato e assegnazione delle opportunita' (Lead, Referral, Tour), esito delle
  prove (Pass), disdette (agganciate a quella del mirror dello stesso
  contratto, se c'e'), rinnovi, task (nuovi, fatti, con esito), commenti,
  controlli e tessera dei nuovi contratti. Un record che non va resta con
  l'errore in `airtable.record.errore` e non ferma gli altri.

Un task di Airtable e' **fatto** se ha l'ESITO (POSITIVO / NEGATIVO) o se
«Completato» e' Si (`20260929c`): da maggio 2026 lo staff chiude i task con
l'esito e non usa piu' «Completato». Il 29/09/2026 questo ha chiuso nel CRM
1.394 task gia' fatti che risultavano aperti e ha ridato l'esito a 2.599
archiviati; i task aperti veri erano 144.

Una modifica di Airtable si applica solo se su Airtable **quel campo** e'
cambiato: accanto alle righe del CRM resta l'ultimo valore di Airtable
applicato (`airtable_stato_il`, `airtable_assegnato`, `airtable_note`,
`airtable_impronta`). Cosi' un record che torna perche' e' cambiato un campo
calcolato non tocca niente, e quello che si fa nel CRM resta finche' su
Airtable non si cambia la stessa cosa. Un lead vinto dal mirror non si riapre;
un task chiuso nel CRM non si riapre. Il giorno che Airtable si spegne basta
disattivare il workflow.

Per vedere a che punto e':

```sql
select tabella, count(*) filter (where applicato_il is null) da_applicare,
       count(errore) errori, max(importato_il) ultimo_cambio
  from airtable.record group by 1;
select esito -> 'airtable' from crm.alimenta_log order by id desc limit 5;
```

**Rinnovi** nel menu: gli abbonamenti in scadenza (`public.rinnovi`, 338
dallo storico di Airtable il 29/09/2026), da gestire in ordine di scadenza,
con l'esito (rinnovato / non rinnovato), chi li segue e le note; accanto, se
su PerfectGym c'e' gia' un abbonamento nuovo della persona. Per ora nascono
su Airtable (l'automazione di fine mese) e arrivano col sync.

### Le richieste dei moduli, dritte nel CRM (`20260928n`)

I workflow n8n dei moduli, `passion-prova-compilata` (il form Prova Passion
del sito), `passion-referral` (il form /referral, un lead per ogni amico) e i
vecchi form PROVA PASSION e REFERRAL PASSION (cartella PASSION/RICHIESTE),
accanto alla scrittura su Airtable chiamano l'Edge Function
`crm-richiesta` (nodo «Nuovo lead nel CRM», stessa credenziale e stesso token
dell'import), che crea persona e lead con `crm.nuova_richiesta()`: le regole
sono quelle dell'import, il Pass del sito nasce vinto con la sua prova. Il nodo
e' un ramo a parte, eseguito per primo: se il CRM non risponde il modulo va
avanti lo stesso.

### I lead dei moduli Meta, dritti nel CRM (`20260929d`)

Il workflow n8n «PASSION: Lead dai moduli Meta nel CRM» (`WV91lQokWaEEFdy5`,
cartella PASSION/RICHIESTE) ogni 5 minuti chiede a Meta (Graph API
`/<form_id>/leads`, credenziale «Facebook Lead Ads account») i lead delle
ultime 2 ore dei moduli istantanei della pagina Passion Fitness Roma
Tuscolana, e li manda a `crm-richiesta` con `rif` = `meta-<id del lead>`,
campagna, gruppo di inserzioni e modulo. Niente trigger Facebook Lead Ads:
Meta concede un solo webhook per app, e quello dell'app di n8n e' gia' usato.

- **modulo nuovo** = una riga nel nodo «Moduli da leggere» (id e nome);
- **i campi** si riconoscono dal nome (nome, cognome, e-mail, telefono,
  attivita'); l'orario di ricontatto e «quando vorresti iniziare» vanno
  insieme in `orario_ricontatto`;
- **niente doppioni**: rileggere le stesse 2 ore ritrova il lead dal `rif`;
  finche' Zapier scrive anche su Airtable, il record che torna col sync si
  aggancia allo stesso lead (stessa persona e fonte nella mezz'ora).

## L'app (Next.js, alla radice del repository)

Le interfacce della riunione, nello stile del sito (barra nera, rosso #E3032D,
fondo rosa, titoli in Anton): **Da gestire** (la home: i numeri, i miei task,
le prove in scadenza, i lead da prendere), **Lead** (prendi in carico,
assegna, chiudi vinta/persa), la **scheda persona** (i dati di PerfectGym, i
contenitori con le loro azioni, la storia di commenti e task), **Prove**,
**Nuovi contratti**, **Disdette**, **Task**, **Cerca**.

### La dashboard abbonamenti (`20260928p`, `20260928q`)

**Abbonamenti** nel menu: i numeri di `crm_abbonamenti()`, letti dal mirror
ogni volta che si apre la pagina. In cima gli abbonamenti e i pass attivi oggi,
contro lo stesso giorno di uno e due anni fa; poi, sugli ultimi 24 mesi, gli
attivi a fine mese, i nuovi (esclusi i rinnovi), gli scaduti non rinnovati
entro 30 giorni e il saldo fra i due; i **pass di prova** (Guest Pass e Pass
giornalieri) contati per persona, con quante si sono abbonate durante la prova
o entro 30 giorni (`20260928r`); in
fondo quanto durano gli abbonamenti senza scadenza, mensili, quadrimestrali e
annuali: quanti mesi restano dopo il vincolo minimo, trimestre per trimestre.
Sul telefono i grafici scorrono di lato; toccando una colonna si apre il
riquadro con i numeri del mese.

Le regole stanno nelle migrazioni, non nell'app: abbonamento e' un contratto
non aggiuntivo con canone (`membershipFee`) sopra lo zero; rinnovo e' un
abbonamento che parte mentre la persona ne ha un altro, o entro 30 giorni
dalla fine (contano anche i piani OLD del vecchio gestionale, a canone zero);
pass di prova e' un piano che si chiama pass, prova o guest (come per le
prove del CRM), senza gli aggregatori (Fitprime + Gympass, Wellhub): si
contano le persone, e i pass della stessa persona a meno di 30 giorni l'uno
dall'altro sono una prova sola; non contano quelli di chi era gia' abbonato.
La durata si misura sulla **catena** (`crm.catene`): abbonamenti della stessa
persona senza piu' di 30 giorni di vuoto sono una sola permanenza, anche se
cambia piano (mensile -> quadrimestrale -> annuale); il tipo e' quello con cui
e' entrata. Gli abbonamenti a pagamento su PerfectGym partono da luglio 2024:
il 28/09/2024 i soci erano quasi tutti sui piani OLD (994, contro 515), e la
pagina lo dice accanto al confronto con due anni fa.

### Debitori (`20260929a`)

**Debitori** nel menu: i soci di Passion col saldo negativo su PerfectGym.
Il saldo non si copia: `crm_debitori()` lo legge dal mirror
(`perfectgym.member_balances`, `currentBalance`) a ogni apertura, e il mirror
lo ricontrolla ogni 2 minuti e subito dopo ogni pagamento (webhook
`ContractPaymentDone` e `UserModified`). Chi paga esce dall'elenco da solo e
passa in **Rientrati**. I filtri: **Abbonamento attivo** (un abbonamento a
pagamento, non aggiuntivo, Current, Freezed o NotStarted), **Abbonamento
scaduto** (tutti gli altri), Tutti; e di chi e' il recupero (di tutti, i miei,
da assegnare).

Il lavoro sta in `public.debiti`, una riga ogni volta che un socio va in
negativo, aperta finche' il saldo non rientra, con chi segue il recupero. Il
recupero si fa coi task (`task.debito_id`): si mettono dalla riga del
debitore, a se' o a un altro operatore, e compaiono fra i Task e nella storia
della persona. Chi riceve il primo task, se il debito non lo segue ancora
nessuno, diventa chi lo segue; si prende in carico o si riassegna anche senza
task. `crm.alimenta()` apre i debiti nuovi e chiude quelli rientrati ogni 5
minuti. La sezione l'hanno ricevuta tutti gli operatori; si toglie da Utenti.

### Utenti: sezioni e autorizzazioni (`20260928q`)

**Nuovi contratti e' sospesa** (dal 29/09/2026): `SOSPESE` in
`lib/permessi.ts` la spegne per tutti, admin compresi. Sparisce dal menu, dalla
home (il riquadro «Contratti da controllare»), dalla scheda persona e dalle
spunte di Utenti, e la pagina rimanda alla home. I nuovi contratti intanto
continuano ad arrivare dal mirror, e chi aveva la sezione la tiene: per
riaccenderla basta toglierla da `SOSPESE`.
Nella scheda persona, al posto dei riquadri «Nuovo contratto · Controllato»,
ci sono i contratti di PerfectGym, uno per riquadro: piano, stato, firma,
inizio, fine, disdetta, canone, giorno di addebito, rinnovo automatico,
aggiuntivo (`20260929i`).

**Filtro per consulente** (`20260929g`): in Lead e in Task si sceglie un
operatore e si vedono i lead assegnati a lui, o i suoi task. Il filtro sta in
`crm_lead()` e `crm_task()` (`p_consulente`), prima del limite di righe.

**Nuovo task: programmare o registrare** (`20260929h`): nella scheda persona
un task «da programmare» ha la data scelta e le note di preparazione (`nota`);
uno «registrato» e' gia' fatto, con data e ora di adesso (non si scelgono),
l'esito e le note dell'esito (`crm_task_registra()`, `nota_esito`).

**Utenti** nel menu, per gli admin e per chi ha l'autorizzazione «Gestione
utenti»: per ogni operatore le **sezioni** che vede (Lead, Prove, Nuovi
contratti, Disdette, Rinnovi, Task, Cerca, Debitori, Abbonamenti) e le **autorizzazioni** («Lead
degli altri»: riassegnare e chiudere anche i lead in carico a un altro;
«Gestione utenti»). Stanno in `public.staff.sezioni` e
`public.staff.autorizzazioni`. Un admin vede tutto; la home e la scheda
persona le vedono tutti. Il menu mostra solo le sezioni abilitate e ogni
pagina rimanda alla home chi non la vede; la dashboard abbonamenti la
controlla anche il database (`crm.richiedi_sezione`). Chi c'era ha preso le
sezioni operative: la dashboard, che ha i numeri dell'azienda, la vedono gli
admin e chi la riceve da Utenti. Nessuno cambia il proprio ruolo o si toglie
l'accesso da solo, e il ruolo admin lo da' e lo toglie solo un admin. Un
utente nuovo si crea da li', e gli parte subito l'email di invito
(`20260929f`, Edge Function `crm-invito`): il link porta a `/auth/callback`,
dove sceglie la password. Dalla scheda di ognuno si rimanda l'invito, o a chi
l'accesso ce l'ha gia' il link per una nuova password. Un admin vede tutte le
sezioni e ha tutte le autorizzazioni: finche' il ruolo e' Admin le spunte sono
ferme; per scegliergliele si passa a Consulente.

**Rimuovere un utente** (`20260929e`): in fondo alla sua scheda, «Rimuovi
utente». Il lavoro aperto (lead da gestire o in gestione, task aperti,
debitori da recuperare, rinnovi senza esito) passa all'operatore scelto, o
torna da assegnare. L'accesso in Supabase si cancella. Chi non ha storia nel
CRM si cancella del tutto; chi ce l'ha resta nella storia col suo nome,
spento e segnato rimosso (`staff.rimosso_il`), e sparisce da Utenti e dagli
elenchi. Stesse regole di Utenti: un admin lo rimuove solo un admin, nessuno
rimuove se stesso. Ricreare un utente con la stessa email lo riporta com'era.

Su Vercel c'e' solo la chiave anon (`NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`). I permessi li
controlla il database: ogni funzione `crm_*` (`20260928i`) e' `security
definer`, eseguibile solo da `authenticated`, e per prima cosa verifica che
l'email di chi chiama sia di uno staff attivo. Riassegnare o chiudere un lead
puo' solo chi ce l'ha in carico, o un admin.

Gli accessi: l'invito da Utenti crea l'utente in Supabase con la stessa email
della tabella `staff`; entra con email e password. «Password dimenticata»
manda il link solo a chi l'accesso ce l'ha gia' (agli altri non dice niente,
per non rivelare quali email esistono): chi non ce l'ha va invitato da Utenti.
Le email partono dall'SMTP impostato in Supabase (Authentication -> Emails), e
`<sito>/auth/callback` dev'essere fra i Redirect URLs.

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
