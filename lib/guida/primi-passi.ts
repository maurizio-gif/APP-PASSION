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
- **il lavoro dello staff**: le opportunità, le prove, i rinnovi, le disdette, i debitori, i task, i ticket. Questo si fa qui.

Molte cose il CRM le fa da solo: da fuori arrivano solo le opportunità dei moduli (sito, referral, Meta); tutto il resto nasce da quello che succede su PerfectGym. Le **prove** dai pass; i **rinnovi** dagli abbonamenti a scadenza fissa (Reformer, percorsi con trainer) che stanno per finire; le **disdette** dagli abbonamenti mensili che il socio disdice; i **debitori** dal saldo negativo. E poi opportunità e prove si chiudono come vinte o iscritte quando compare l'abbonamento; i task della fine prova, delle disdette e dei rinnovi si creano da soli.

> Airtable non si usa più: dal 30 settembre 2026 tutto il lavoro si fa qui. Da fuori arrivano solo le opportunità dei moduli; il resto nasce da PerfectGym.

## La home: Dashboard consulente
Appena entri, i numeri di oggi. Ogni riquadro porta al suo elenco:

- **Opportunità da gestire**: non ancora prese in carico; **Le mie opportunità**: in gestione a te;
- **Prove in scadenza**: finiscono entro 3 giorni;
- **Disdette da gestire** e **Rinnovi da gestire**: non ancora presi in carico, con quanti sono tuoi;
- **I miei task**: di oggi e arretrati;
- **Ticket in attesa**: R2D aspetta una risposta dal desk. Il supporto vede anche **Ticket da verificare**.

Il riquadro è evidenziato quando c'è qualcosa da fare. Niente elenchi qui: cliccando il riquadro apri la sezione con l'elenco completo.

Nella colonna **Primo ricontatto** di ogni opportunità, in **Opportunità**, vedi in quanto tempo è stata ricontattata, anche con un tentativo, o da quanto aspetta. Il tempo conta solo nell'orario di lavoro (8–22 dal lunedì al venerdì, 8–20 sabato e domenica): verde fino a 30 minuti, giallo fino a 2 ore, rosso oltre.

Sotto i riquadri, **La mia performance**: le tue percentuali settimana per settimana (opportunità chiuse, diventate Guest Pass, Guest Pass diventati abbonamenti), gli abbonamenti venduti, il tempo di primo ricontatto, disdette e rinnovi, con il confronto con la settimana scorsa e con la media delle quattro prima.

## Le regole che valgono ovunque
- **Il lavoro sta nei task.** Ogni contatto con una persona si segna come task, fatto o da fare: è la sua storia. Vedi [Task](/dashboard/guida/task).
- **Chi segue cosa.** Opportunità, prove, rinnovi, disdette e debitori hanno chi li segue, e i task automatici vanno a lui. Con **Tutti i consulenti**, in ogni sezione, vedi il lavoro di un collega.
- **Le cose chiuse non si modificano.** Un'opportunità, una prova, un rinnovo o una disdetta con l'esito si legge. Per cambiarlo, dalla scheda della persona, **«Riapri»** e **«Sì, riapri»**.
- **Prima cerca, poi crea.** La ricerca è in cima al menu: nome, telefono o email.

## Sul telefono
Il menu si apre con **☰** in alto. Negli elenchi ogni riga diventa una scheda, e il modulo per gestirla sta dietro **«Gestisci»**. Salvando il CRM sulla schermata home del telefono, si apre con l'icona «CRM Passion».

## Se qualcosa non torna
Prima controlla nella scheda della persona (abbonamento, saldo, certificato). Se è un problema del CRM o di PerfectGym, apri un **ticket**: vedi [Ticket di assistenza](/dashboard/guida/ticket).
`,
}
