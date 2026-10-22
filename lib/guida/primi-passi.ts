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

## La home: Da gestire
Appena entri, i numeri di oggi, in alto a schede. Ne è aperta una alla volta: premi su una scheda e sotto compare il suo elenco.

- **Opportunità da gestire**: non ancora prese in carico, con quante sono tue;
- **Prove in scadenza**: finiscono entro 3 giorni;
- **Rinnovi da gestire** e **Disdette da gestire**: non ancora presi in carico, con quanti sono tuoi;
- **Non assegnati**: opportunità e prove che nessun consulente segue. Il numero non c'è subito: premi **«Calcola»** e la scheda si apre e lo calcola;
- **I miei task**: di oggi e arretrati.

Sotto la scheda aperta trovi l'elenco, con le azioni per ogni riga (per esempio **«Prendo in carico»**, oppure **«Fatto ✓»** e **«Non risponde»** per i task). La scheda è evidenziata quando c'è qualcosa da fare. I ticket non stanno più in home: li trovi nella sezione [Ticket](/dashboard/ticket).

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
