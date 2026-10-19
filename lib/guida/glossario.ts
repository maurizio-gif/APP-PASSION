import type { Argomento } from '.'

export const glossario: Argomento = {
  chiave: 'glossario',
  titolo: 'Le parole del CRM',
  sezione: null,
  inBreve: 'Cosa vuol dire ogni parola che trovi nel CRM, in una riga: le persone, il lavoro, gli stati e gli esiti, i dati di PerfectGym.',
  testo: `
## Le persone e i posti
- **PerfectGym**: il gestionale del club. Da lì arrivano abbonamenti, pagamenti, saldo, certificato, ingressi e prenotazioni. Si leggono qui, si cambiano su PerfectGym.
- **Socio**: chi ha un profilo su PerfectGym.
- **Scheda persona**: la pagina di una persona, con i dati di PerfectGym e il lavoro fatto nel CRM. Si apre dal nome, in qualunque elenco.
- **Consulente**: chi lavora al desk. Vede le sezioni che gli sono state date.
- **Admin**: vede tutto e può tutto. **Admin + supporto** in più riceve i ticket degli altri. **Superadmin**: R2D.
- **R2D**: chi si occupa del CRM e risolve i ticket.

## Il lavoro
- **Lead**: chi ci contatta e non è ancora iscritto.
- **Fonte** (nell'elenco «Tipologia»): da dove arriva un lead: **Sito**, **Referral**, **Meta**, **Tour / walk-in**, **Altro**.
- **Prova**: un pass attivato su PerfectGym (un piano che si chiama pass, prova o guest). Entra nel CRM da sola, entro 5 minuti.
- **Pass**: il piano di prova. Quello richiesto dal sito dura 7 giorni.
- **Rinnovo**: un abbonamento **a scadenza fissa** (Reformer 12 mesi, Percorsi «I ❤️ My Trainer», PT Elite) che sta per finire.
- **Disdetta**: un abbonamento **mensile con addebito** che il socio ha disdetto.
- **Debitore**: un socio con il saldo negativo su PerfectGym.
- **Task**: una cosa da fare con una persona: **Telefonata**, **In sede**, **WhatsApp**, **Email**, **Customer care**. È anche la storia dei contatti.
- **Ticket**: la richiesta al supporto o a R2D quando qualcosa non funziona, per una domanda, un'attività o una proposta di modifica.
- **Lead degli altri**: l'autorizzazione per gestire anche il lavoro in carico a un collega.

## Gli stati e gli esiti
- **Da gestire**: è arrivato e nessuno lo segue ancora.
- **In gestione**: qualcuno lo ha preso in carico.
- **In carico a**: chi lo segue.
- **Prendo in carico**: lo segui tu, da adesso. **Assegna** lo passa a un collega. **Rimetti da assegnare** lo fa tornare a nessuno.
- **Vinta** (lead): la persona si è iscritta o ha attivato una prova. La segna il CRM da solo: **Vinta · contratto** o **Vinta · prova**.
- **Persa** (lead): non si iscrive. La segni tu, con il motivo se vuoi.
- **Iscritto** e **Non iscritto** (prova): l'esito della prova. **Iscritto** lo segna il CRM quando compare l'abbonamento; **Non iscritto** da solo 30 giorni dopo la fine del pass, oppure a mano.
- **Finite senza esito**: il pass è finito e non c'è ancora un abbonamento. Sono le prove da richiamare.
- **Rinnovato** e **Non rinnovato**: l'esito del rinnovo. Lo segni sempre tu.
- **Recuperato**, **Perso**, **In sospeso**: l'esito della disdetta. **In sospeso**: ci pensa, da richiamare.
- **Rientrati**: i debitori che hanno pagato negli ultimi 90 giorni.
- **Arretrato**: un task con la data passata (da ieri indietro).
- **Fatto ✓** e **Negativo** (in home **Non risponde**): i due modi di chiudere un task. Il primo è andato bene, il secondo no.
- **Riapri**: toglie l'esito a una cosa chiusa, per poterla modificare.

## I dati di PerfectGym
- **Saldo**: quanto deve il socio. In rosso se è negativo.
- **Abbonamento**: un contratto principale con un canone. I certificati e i pacchetti aggiuntivi non contano.
- **Certificato medico**: **attivo** (con la scadenza), **scaduto** o **non presente**. Conta solo quello definitivo, non il temporaneo.
- **Ingressi**: le entrate in sede. La scheda mostra gli ultimi 10 e quanti negli ultimi 30 giorni.
- **Prenotazioni**: presente, assente, annullata, prenotata, in lista d'attesa.

## I ticket
- **Qualcosa non funziona**, **Domanda**, **Attività da fare**, **Proposta di modifica**: i quattro tipi di ticket.
- **Blocca il lavoro di tutti**: la spunta per i problemi che fermano tutti (tornello, app giù, pagamenti). Chiama anche R2D: il ticket da solo non avvisa nessuno.
- **Aspetta Passion**: R2D ha chiesto un'informazione e aspetta la risposta del desk.
- **Thread**: tutti i messaggi e i passaggi del ticket, in ordine.
`,
}
