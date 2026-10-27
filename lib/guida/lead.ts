import type { Argomento } from '.'

export const lead: Argomento = {
  chiave: 'lead',
  titolo: 'Opportunità',
  sezione: 'lead',
  inBreve: 'Chi ci contatta e non è ancora iscritto: da dove arriva, chi la prende in carico, e quando si chiude. Vinta la segna PerfectGym, persa la segni tu.',
  testo: `
## Da dove arrivano
Ogni opportunità ha una **fonte** (il bollino che compare con il nome del cliente nell'elenco):

- **Sito**: i moduli del sito arrivano da soli. Chi chiede il **Pass** dal sito non è un'opportunità da lavorare: arriva già **Vinta · prova**, con la sua prova in [Prove](/dashboard/prove).
- **Referral**: il modulo referral del sito arriva da solo, un'opportunità per ogni amico presentato; nella scheda c'è **Presentato da**.
- **Meta**: i moduli delle inserzioni Facebook e Instagram arrivano da soli, ogni 5 minuti; il dettaglio è la campagna.
- **Tour / walk-in**: chi passa in reception o chiama. La inserisci tu, con **«+ Nuova opportunità»**.
- **Altro**: tutto il resto.

Se la stessa persona manda due volte lo stesso modulo nella mezz'ora, l'opportunità resta una sola.

## Chi si iscrive senza chiedere informazioni
Se una persona si iscrive senza che sia nata un'opportunità («in prima battuta»), il suo abbonamento nuovo compare in **[Senza consulente](/dashboard/senza-consulente)**, nella linguetta **«Contratti senza consulente»** (rinnovi e cambi abbonamento non ci sono). Il riquadro **«Senza consulente»** della home porta lì: ci trovi anche le opportunità e le prove in corso che nessuno segue. Chi l'ha seguita lo prende in carico con **«Prendo in carico»** e **scrive una nota** (obbligatoria): come è nato il contratto, cosa vi siete detti. La nota resta anche nella scheda della persona.

- Se l'iscrizione l'ha fatta la persona da sola, online, si segna **«Online, nessun consulente»**: non va a nessuno.
- Se la persona ha già lavorato con un consulente (task fatti, anche un tentativo, o una prova che seguiva) compare **«Suggerito»**, già scelto nella tendina, con il motivo. È solo un suggerimento: un task non dice chi ha venduto. Confermi o scegli un altro.
- Un collega lo si può indicare nella tendina; uno già assegnato lo cambia solo chi lo ha in carico, o un admin.
- Il consulente scritto su PerfectGym **non si usa**: conta solo chi lo prende in carico qui. Gli abbonamenti in prima battuta contano nella performance di chi li ha presi.

## Le fasi
1. **Da gestire**: è arrivata, nessuno la segue ancora.
2. **In gestione**: qualcuno l'ha presa: con **«Prendo in carico»** è tua, con **«Assegna»** la dai a un collega, con **«Rimetti da assegnare»** torna da gestire.
3. **Vinta**: la persona si è iscritta o ha attivato una prova. **Non la segni tu**: la segna il CRM da solo quando su PerfectGym compare il suo contratto (**Vinta · contratto**) o il suo pass (**Vinta · prova**).
4. **Persa**: non si iscrive. La segni tu dalla scheda della persona: **«Perché è persa (facoltativo)»** e **«Persa»**.

> Perché il CRM riconosca l'iscrizione, su PerfectGym la persona deve avere **la stessa email o lo stesso telefono** dell'opportunità. Se li scrivi diversi, l'opportunità resta aperta anche se si è iscritta.

## Il lavoro di ogni giorno
1. Apri **Da gestire** (anche dalla sezione **Senza consulente**, elenco **Opportunità senza consulente**): i più recenti sono in cima.
2. Prendi l'opportunità con **«Prendo in carico»**, o assegnala a chi la deve seguire.
3. Chiama, scrivi su WhatsApp o per email. Ogni contatto segnalo come **task registrato** nella scheda della persona (Task: Telefonata, WhatsApp, Email o In sede; l'esito; le note dell'esito): è la storia dell'opportunità, e le note compaiono nell'elenco in **«Nota task»**.
4. Se va richiamato, **programma un task** con la data: te lo ritrovi in home il giorno giusto.
5. Quando si iscrive o attiva la prova su PerfectGym, l'opportunità si chiude da sola come vinta. Se non si iscrive, chiudila come **Persa** con il motivo.

Per le fasi e i task, vedi anche [Task](/dashboard/guida/task) e [La scheda persona](/dashboard/guida/scheda-persona).

## Nuova opportunità
Da **«+ Nuova opportunità»** (in home, in Opportunità e in Cerca):

- **Nome**, **Cognome**, **Telefono**, **Email**: serve almeno un telefono o un'email;
- **Fonte** (di solito **Tour / walk-in**), **Dettaglio fonte**, **Attività di interesse**;
- **«Ha dato il consenso al trattamento dei dati (privacy)»**: spuntalo solo se la persona l'ha dato davvero;
- **Assegnata a**: propone te. Scegli un collega se la deve seguire lui, o **«Nessuno: resta da assegnare»**. Assegnata, l'opportunità nasce **In gestione**; senza nessuno, **Da gestire**.

**«Crea l'opportunità»** la crea nel CRM **e su PerfectGym** (dove diventa un lead), e apre la scheda della persona. Se la persona è già su PerfectGym, lì non si crea un doppione. Se PerfectGym la rifiuta (per esempio un numero straniero scritto male), l'opportunità nel CRM resta, il motivo compare nella scheda e da lì si riprova con **«Riprova su PerfectGym»**.

> Prima di creare un'opportunità, **cerca la persona**: la nuova opportunità si crea sempre, anche se la persona ne ha già una aperta. La ricerca è in cima al menu.

## Le viste e i filtri
- **Da gestire**, **In gestione**, **Le mie** (quelle in gestione a te), **Senza task**, **Prove in corso**, **Prove scadute**, **Vinte**, **Perse**, **Tutte**;
- **Senza task**: le opportunità in gestione su persone che non hanno nessun task aperto da oggi in avanti. Nessuno ha fissato il prossimo passo: o si programma un task, o l'opportunità si chiude. Ci sono anche quelle con solo task arretrati non fatti;
- in cima: la ricerca per nome, telefono o email, **Tutte le fonti** e **Tutti i consulenti** (il lavoro di un collega), poi **«Filtra»**;
- **Prove in corso** e **Prove scadute**: le opportunità che si sono chiuse come **Vinta · prova**. In corso, il pass è ancora attivo; scadute, il pass è finito e non c'è ancora un abbonamento. Il numero è quello delle **opportunità**: in [Prove](/dashboard/guida/prove) ce ne sono di più, perché lì si contano tutti i pass, anche di chi non ha un'opportunità;
- l'elenco mostra al massimo 200 opportunità, le più recenti.

## Chi può fare cosa
- Un'opportunità **da gestire** la può prendere chiunque.
- Un'opportunità **in carico a te** la puoi passare a un collega (**«Assegna»**) o **rimettere da assegnare** (**«Rimetti da assegnare»**, nell'elenco o nella scheda): torna fra i **Da gestire**, senza nessuno, e la prende chi arriva. I task già programmati restano a chi li aveva.
- Un'opportunità **in carico a un collega** la riassegna, la rimette da assegnare o la chiude solo lui, un admin o chi ha l'autorizzazione **«Opportunità degli altri»**.
- Un'opportunità chiusa si **riapre** dalla scheda con **«Riapri»**: prima compare un avviso (riaprendo si toglie l'esito), poi **«Sì, riapri»**.
`,
}
