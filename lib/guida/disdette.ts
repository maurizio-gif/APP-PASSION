import type { Argomento } from '.'

export const disdette: Argomento = {
  chiave: 'disdette',
  titolo: 'Disdette',
  sezione: 'disdette',
  inBreve: 'Chi disdice su PerfectGym arriva qui da solo, con una telefonata per oggi: capire il motivo, provare a recuperarlo, segnare com’è finita.',
  testo: `
## Da dove arrivano
Quando su PerfectGym un abbonamento mensile (con addebito) viene disdetto, la disdetta arriva nel CRM da sola, entro 5 minuti. Nello stesso momento il CRM crea un task per **oggi**: una Telefonata, «Disdetta del ... (piano): chiamare per capire il motivo e provare a recuperarlo».

> Il task va a chi segue la disdetta. Una disdetta appena arrivata non la segue ancora nessuno: il suo task finisce fra i task **Senza assegnatario**. Chi si occupa delle disdette li controlla ogni giorno, in [Task](/dashboard/task) (Chi: **Senza assegnatario**).

## Le viste
- **Da gestire**: senza esito o **In sospeso**, con la data di disdetta nel futuro o al massimo 30 giorni fa. È il numero che vedi in home, **«Disdette»**;
- **Gestite**: **Recuperato** o **Perso**;
- **Tutte**.

Con **Tutti i consulenti** vedi quelle che segue un collega.

## Il lavoro
1. Chiama il socio il giorno stesso: più passa il tempo, più è difficile recuperarlo.
2. Segna com'è andata sul task.
3. Sulla riga della disdetta (**«Gestisci»** sul telefono):
  - **Contatto**: Telefonata o Appuntamento;
  - **Esito**: **Recuperato** (resta), **Perso** (se ne va), **In sospeso** (ci pensa, da richiamare);
  - **Motivo**: cambio contratto, trasferimento, malattia o infortunio, mancanza di tempo, prezzo, mancanza di motivazione, fine contratto, attività mancante, qualità delle lezioni, chiuso dal management, cessione del contratto, non raggiungibile, altro;
  - **Note** e **Assegnata a**, poi **«Salva»**.
4. Se è **In sospeso**, programma un task per richiamarlo: la disdetta resta fra quelle da gestire.

Se salvi un esito e la disdetta non la seguiva nessuno, da quel momento la segui tu.

> Il **motivo** conta anche quando la persona non si recupera: è da lì che si capisce perché i soci se ne vanno.

## Riaprire
Dalla scheda della persona: **«Riapri»**, poi **«Sì, riapri»**. Si toglie l'esito; motivo, note e chi la segue restano.
`,
}
