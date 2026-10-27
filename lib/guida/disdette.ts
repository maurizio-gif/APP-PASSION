import type { Argomento } from '.'

export const disdette: Argomento = {
  chiave: 'disdette',
  titolo: 'Disdette',
  sezione: 'disdette',
  inBreve: 'Chi disdice su PerfectGym arriva qui da solo: si prende in carico come un’opportunità, si chiama per capire il motivo e recuperarlo, e l’esito si scrive nella scheda.',
  testo: `
## Da dove arrivano
Da **PerfectGym**, da soli: niente si inserisce a mano. Le disdette sono solo degli **abbonamenti mensili con addebito** (Sala Pesi, Corsi Fitness, Open, Formula 8, con durata minima di 4 o 12 mesi o Flex), che vanno avanti finché il socio non disdice. Quando su PerfectGym compare la disdetta, arriva nel CRM entro 5 minuti. Nello stesso momento il CRM crea un task per **oggi**: una Telefonata, «Disdetta del ... (piano): chiamare per capire il motivo e provare a recuperarlo».

Gli abbonamenti **a scadenza fissa** (Reformer 12 mesi, Percorsi «I ❤️ My Trainer», PT Elite) non sono disdette: quando finiscono sono un [rinnovo](/dashboard/guida/rinnovi).

**Una disdetta è definitiva.** Se la persona ha un altro abbonamento che dà **continuità** (il nuovo è già in corso o parte al più tardi il giorno dopo la fine del vecchio: il vecchio finisce il 26, il nuovo comincia il 27) è un **cambio abbonamento**, e non compare fra le disdette: non è da gestire, non ha il task e non conta nei numeri. Vale anche per le disdette passate, e se il nuovo abbonamento compare dopo la disdetta questa sparisce da sola. Se invece il nuovo parte dopo una pausa, anche di un solo giorno in più, è una disdetta vera: resta qui da gestire.

> Una disdetta appena arrivata non la segue ancora nessuno, e il suo task resta senza assegnatario. Chi la **prende in carico** prende anche il task.

## Si prende in carico, come un'opportunità
- Una disdetta **da gestire** la prende chiunque, con **«Prendo in carico»** sulla sua riga.
- Una disdetta **in carico a te** la passi a un collega (la tendina e **«Assegna»**) o la **rimetti da assegnare** (**«Rimetti da assegnare»**): torna fra le **Da gestire**, senza nessuno. I task già assegnati restano a chi li aveva.
- Una disdetta **in carico a un collega** la riassegna, la rimette da assegnare o la chiude solo lui, un admin o chi ha l'autorizzazione **«Opportunità degli altri»**.

Gli stessi bottoni sono anche nella scheda della persona.

## Le viste
- **Da gestire**: aperte (senza esito o **In sospeso**) e di nessuno, con la data di disdetta nel futuro o al massimo 30 giorni fa. È il numero che vedi in home, **«Disdette da gestire»**;
- **In gestione**: aperte e in carico a qualcuno; **Le mie**: in carico a te;
- **Gestite**: **Recuperato** o **Perso**;
- **Tutte**.

Con **Tutti i consulenti** vedi quelle che segue un collega.

## Il lavoro
1. Prendi la disdetta con **«Prendo in carico»**.
2. Chiama il socio il giorno stesso: più passa il tempo, più è difficile recuperarlo. Segna com'è andata sul task.
3. Apri la **scheda della persona** (dal nome) e, nel riquadro **Disdetta**:
  - **Contatto**: Telefonata o Appuntamento;
  - **Esito**: **Recuperato** (resta), **Perso** (se ne va), **In sospeso** (ci pensa, da richiamare);
  - **Motivo**: cambio contratto, trasferimento, malattia o infortunio, mancanza di tempo, prezzo, mancanza di motivazione, fine contratto, attività mancante, qualità delle lezioni, chiuso dal management, cessione del contratto, non raggiungibile, altro;
  - le **Note**, poi **«Salva la disdetta»**.
4. Se è **In sospeso**, programma un task per richiamarlo: la disdetta resta aperta, fra le tue.

Se salvi una disdetta che non seguiva nessuno, da quel momento la segui tu.

> Il **motivo** conta anche quando la persona non si recupera: è da lì che si capisce perché i soci se ne vanno.

## Riaprire
Dalla scheda della persona: **«Riapri»**, poi **«Sì, riapri»**. Si toglie l'esito; motivo, note e chi la segue restano. La riapre chi la seguiva, un admin o chi ha **«Opportunità degli altri»**.
`,
}
