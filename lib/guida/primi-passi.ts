import type { Argomento } from '.'

export const primiPassi: Argomento = {
  chiave: 'primi-passi',
  titolo: 'Come è fatto il CRM',
  sezione: null,
  inBreve: 'Da dove vengono i dati, cosa si vede nella home, e le poche regole che valgono in tutte le sezioni.',
  testo: `
## Due fonti, un posto solo
Nel CRM trovi insieme due cose:

- **i dati di PerfectGym**: abbonamenti, pagamenti, saldo, certificato, ingressi, prenotazioni. Arrivano da soli, aggiornati ogni pochi minuti. Qui si leggono: **si cambiano su PerfectGym**;
- **il lavoro dello staff**: i lead, le prove, i rinnovi, le disdette, i debitori, i task, i ticket. Questo si fa qui.

Molte cose il CRM le fa da solo: da fuori arrivano solo i lead dei moduli (sito, referral, Meta); tutto il resto nasce da quello che succede su PerfectGym. Le **prove** dai pass; i **rinnovi** dagli abbonamenti a scadenza fissa (Reformer, percorsi con trainer) che stanno per finire; le **disdette** dagli abbonamenti mensili che il socio disdice; i **debitori** dal saldo negativo. E poi lead e prove si chiudono come vinti o iscritti quando compare l'abbonamento; i task della fine prova, delle disdette e dei rinnovi si creano da soli.

> Airtable non si usa più: dal 30 settembre 2026 tutto il lavoro si fa qui. Da fuori arrivano solo i lead dei moduli; il resto nasce da PerfectGym.

## La home: Da gestire
Appena entri, i numeri di oggi. Ogni riquadro porta al suo elenco:

- **Lead da gestire**: non ancora presi in carico; **I miei lead**: in gestione a te;
- **Prove in scadenza**: finiscono entro 2 giorni;
- **Disdette da gestire** e **Rinnovi da gestire**: non ancora presi in carico, con quanti sono tuoi;
- **I miei task**: di oggi e arretrati;
- **Ticket in attesa**: R2D aspetta una risposta dal desk. Il supporto vede anche **Ticket da verificare**.

Sotto, i lead da gestire, i tuoi task di oggi (con **«Fatto ✓»** e **«Non risponde»**) e le prove in scadenza. Il riquadro è evidenziato quando c'è qualcosa da fare.

## Le regole che valgono ovunque
- **Il lavoro sta nei task.** Ogni contatto con una persona si segna come task, fatto o da fare: è la sua storia. Vedi [Task](/dashboard/guida/task).
- **Chi segue cosa.** Lead, prove, rinnovi, disdette e debitori hanno chi li segue, e i task automatici vanno a lui. Con **Tutti i consulenti**, in ogni sezione, vedi il lavoro di un collega.
- **Le cose chiuse non si modificano.** Un lead, una prova, un rinnovo o una disdetta con l'esito si legge. Per cambiarlo, dalla scheda della persona, **«Riapri»** e **«Sì, riapri»**.
- **Prima cerca, poi crea.** La ricerca è in cima al menu: nome, telefono o email.

## Sul telefono
Il menu si apre con **☰** in alto. Negli elenchi ogni riga diventa una scheda, e il modulo per gestirla sta dietro **«Gestisci»**. Salvando il CRM sulla schermata home del telefono, si apre con l'icona «CRM Passion».

## Se qualcosa non torna
Prima controlla nella scheda della persona (abbonamento, saldo, certificato). Se è un problema del CRM o di PerfectGym, apri un **ticket**: vedi [Ticket di assistenza](/dashboard/guida/ticket).
`,
}
