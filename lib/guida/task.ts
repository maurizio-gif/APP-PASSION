import type { Argomento } from '.'

export const task: Argomento = {
  chiave: 'task',
  titolo: 'Task',
  sezione: 'task',
  inBreve: 'Il lavoro di ogni giorno: telefonate, messaggi e appuntamenti, tuoi o da assegnare. Molti li crea il CRM da solo; tu li chiudi dicendo com’è andata.',
  testo: `
## Il lavoro sta nei task
Ogni cosa da fare con una persona è un **task**: chiamarla, scriverle, vederla in sede. Accanto al tipo c'è da dove viene: **Lead**, **Scadenza pass**, **Rinnovo**, **Disdetta**, **Debito**; niente se riguarda solo la persona. I task sono in questa sezione, in home (**«I miei task»**) e nella scheda della persona, con tutta la sua storia.

## I task che crea il CRM da solo
- **Fine prova**: due giorni prima che il pass finisca, a chi segue la prova. «La prova finisce il ...: chiamare per l'iscrizione.»
- **Disdetta**: appena arriva, per oggi, a chi la segue (se non la segue nessuno resta senza assegnatario). «Disdetta del ...: chiamare per capire il motivo e provare a recuperarlo.»
- **Rinnovo**: 15 giorni prima della scadenza, alle 10, a chi lo segue; non se l'abbonamento nuovo su PerfectGym c'è già.

## Le viste
- **Chi**: **I miei** (si apre qui), **Di tutti**, **Senza assegnatario**; o un collega con **Tutti i consulenti**;
- **Quando**: **Arretrati** (da ieri indietro), **Oggi** (si apre qui), **Prossimi**, **Fatti**.

Un task di oggi già passato di orario resta in **Oggi**, in rosso. Il nome apre la scheda della persona in un'altra scheda del browser, così non perdi l'elenco.

## Chiudere un task
Scrivi **«Com'è andata»** e poi:

- **«Fatto ✓»**: fatto, con esito positivo;
- **«Negativo»** (in home **«Non risponde»**): fatto, ma non è andata (non risponde, non interessato...).

Se il task non era di nessuno, diventa tuo. Un task chiuso non si riapre: se va rifatto, programmane un altro.

## Nuovo task
Dalla scheda della persona, riquadro **Task**, due modi:

- **Da programmare**: una cosa da fare più avanti. **Per** (la disdetta, il rinnovo, il pass o il lead della persona, oppure «Nessuno: solo la persona»), **Task** (Telefonata, In sede, WhatsApp, Email, Customer care), **Quando** (sempre da scegliere), **A chi**, **Note di preparazione**. Poi **«Programma task»**.
- **Registra (già fatto)**: una cosa appena fatta, per lasciarne traccia. **Per**, **Task**, **Esito** (Positivo o Negativo), **Chi l'ha fatto**, **Note dell'esito**; data e ora sono quelle del salvataggio. Poi **«Registra task»**.

Per i debitori il task si mette dalla loro riga, con **«+ Task»**.

> **A chi** propone te. Se tu non ricevi task, la tendina parte dal primo nome dell'elenco: controlla sempre chi c'è scritto prima di salvare. Fra quelli a cui assegnare compare solo chi ha la spunta **«Riceve lead e task»**.
`,
}
