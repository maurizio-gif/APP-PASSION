import type { Argomento } from '.'

export const lead: Argomento = {
  chiave: 'lead',
  titolo: 'Lead',
  sezione: 'lead',
  inBreve: 'Chi ci contatta e non è ancora iscritto: da dove arriva, chi lo prende in carico, e quando si chiude. Vinta la segna PerfectGym, persa la segni tu.',
  testo: `
## Da dove arrivano
Ogni lead ha una **fonte** (la «Tipologia» nell'elenco):

- **Sito**: i moduli del sito arrivano da soli. Chi chiede il **Pass** dal sito non è un lead da lavorare: arriva già **Vinta · prova**, con la sua prova in [Prove](/dashboard/prove).
- **Referral**: il modulo referral del sito arriva da solo, un lead per ogni amico presentato; nella scheda c'è **Presentato da**.
- **Meta**: i moduli delle inserzioni Facebook e Instagram arrivano da soli, ogni 5 minuti; il dettaglio è la campagna.
- **Tour / walk-in**: chi passa in reception o chiama. Lo inserisci tu, con **«+ Nuovo lead»**.
- **Altro**: tutto il resto.

Se la stessa persona manda due volte lo stesso modulo nella mezz'ora, il lead resta uno solo.

## Le fasi
1. **Da gestire**: è arrivato, nessuno lo segue ancora.
2. **In gestione**: qualcuno l'ha preso: con **«Prendo in carico»** è tuo, con **«Assegna»** lo dai a un collega.
3. **Vinta**: la persona si è iscritta o ha attivato una prova. **Non la segni tu**: la segna il CRM da solo quando su PerfectGym compare il suo contratto (**Vinta · contratto**) o il suo pass (**Vinta · prova**).
4. **Persa**: non si iscrive. La segni tu dalla scheda della persona: **«Perché è persa (facoltativo)»** e **«Persa»**.

> Perché il CRM riconosca l'iscrizione, su PerfectGym la persona deve avere **la stessa email o lo stesso telefono** del lead. Se li scrivi diversi, il lead resta aperto anche se si è iscritta.

## Il lavoro di ogni giorno
1. Apri **Da gestire** (anche dalla home, **«Lead da gestire»**): i più recenti sono in cima.
2. Prendi il lead con **«Prendo in carico»**, o assegnalo a chi lo deve seguire.
3. Chiama, scrivi su WhatsApp o per email. Ogni contatto segnalo come **task registrato** nella scheda della persona (Task: Telefonata, WhatsApp, Email o In sede; l'esito; le note dell'esito): è la storia del lead, e le note compaiono nell'elenco in **«Nota task»**.
4. Se va richiamato, **programma un task** con la data: te lo ritrovi in home il giorno giusto.
5. Quando si iscrive o attiva la prova su PerfectGym, il lead si chiude da solo come vinta. Se non si iscrive, chiudilo come **Persa** con il motivo.

Per le fasi e i task, vedi anche [Task](/dashboard/guida/task) e [La scheda persona](/dashboard/guida/scheda-persona).

## Nuovo lead
Da **«+ Nuovo lead»** (in home, in Lead e in Cerca):

- **Nome**, **Cognome**, **Telefono**, **Email**: serve almeno un telefono o un'email;
- **Fonte** (di solito **Tour / walk-in**), **Dettaglio fonte**, **Attività di interesse**;
- **«Ha dato il consenso al trattamento dei dati (privacy)»**: spuntalo solo se la persona l'ha dato davvero;
- **«Lo prendo in carico io»**: già spuntato. Toglilo se il lead deve restare da assegnare.

**«Crea il lead»** lo crea nel CRM **e su PerfectGym**, e apre la scheda della persona. Se la persona è già su PerfectGym, lì non si crea un doppione. Se PerfectGym lo rifiuta (per esempio un numero straniero scritto male), il lead nel CRM resta, il motivo compare nella scheda e da lì si riprova con **«Riprova su PerfectGym»**.

> Prima di creare un lead, **cercalo**: il nuovo lead si crea sempre, anche se la persona ha già un lead aperto. La ricerca è in cima al menu.

## Le viste e i filtri
- **Da gestire**, **In gestione**, **I miei** (quelli in gestione a te), **Vinte**, **Perse**, **Tutti**;
- in cima: la ricerca per nome, telefono o email, **Tutte le fonti** e **Tutti i consulenti** (il lavoro di un collega), poi **«Filtra»**;
- l'elenco mostra al massimo 200 lead, i più recenti.

## Chi può fare cosa
- Un lead **da gestire** lo può prendere chiunque.
- Un lead **in carico a un collega** lo riassegna o lo chiude solo lui, un admin o chi ha l'autorizzazione **«Lead degli altri»**.
- Un lead chiuso si **riapre** dalla scheda con **«Riapri»**: prima compare un avviso (riaprendo si toglie l'esito), poi **«Sì, riapri»**.
`,
}
