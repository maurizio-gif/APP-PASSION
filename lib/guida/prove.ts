import type { Argomento } from '.'

export const prove: Argomento = {
  chiave: 'prove',
  titolo: 'Prove',
  sezione: 'prove',
  inBreve: 'I pass di prova attivati: come sta andando, chi li segue, la telefonata prima della fine. L’esito lo segna PerfectGym: iscritto quando compare l’abbonamento.',
  testo: `
## Da dove arrivano
Ogni pass attivato su PerfectGym (un piano che si chiama pass, prova o guest) diventa una prova nel CRM da solo, entro 5 minuti. La segue chi seguiva il lead della persona.

Chi chiede il Pass dal sito ha subito la sua prova, agganciata al suo lead: parte dal giorno che ha chiesto e dura **7 giorni**, come il Guest Pass. Quando in reception gli attivano il pass su PerfectGym, **la prova resta una sola**:

- prende il pass e **le sue date**, anche se su PerfectGym l'inizio è stato spostato (fino a 30 giorni dopo il giorno chiesto);
- chi la segue, le note e i task restano;
- se la stessa persona chiede la prova due volte nella stessa settimana, resta la richiesta più nuova.

> Il CRM riconosce il pass se su PerfectGym la persona ha **la stessa email o lo stesso telefono** della richiesta. Se li scrivi diversi, la persona si ritrova con due prove: la richiesta e il pass.

## Le viste
- **In corso**: il pass non è ancora finito; prima quelle che finiscono prima;
- **In scadenza**: finiscono entro 3 giorni. Sono anche in home, nel riquadro **«Prove in scadenza»**;
- **Finite senza esito**: il pass è finito e non c'è ancora un abbonamento. **Sono quelle da richiamare**;
- **Chiuse**: con l'esito, iscritto o non iscritto.

Con **Tutti i consulenti** vedi solo le prove che segue un collega.

## Cosa vedi per ogni prova
- il **pass**, le date e quanti giorni mancano (in rosso gli ultimi 3, quelle in scadenza);
- **come va**: gli ingressi e l'ultimo, le lezioni prenotate e quelle fatte;
- **«mai entrato»**: ha il pass ma non è mai venuto. Chiamalo subito;
- **«ha già un contratto su PerfectGym»**: si è già abbonato, l'esito arriverà da solo;
- chi la **segue**, o «nessuno la segue».

## Il lavoro
1. Nei primi giorni guarda **come va**: chi non entra va chiamato prima che il pass finisca.
2. **Due giorni prima della fine** il CRM mette da solo un task a chi segue la prova: una Telefonata, «La prova finisce il ...: chiamare per l'iscrizione». Lo trovi in home e in [Task](/dashboard/task).
3. Chiama e segna com'è andata sul task.
4. In **«Gestisci»** (sul computer è già aperto) scrivi l'**Obiezione** (perché non si iscrive: prezzo, orari, distanza...), le **Note**, e con **«Assegnata a»** chi la segue. Poi **«Salva»**.

> L'abbonamento va fatto sullo **stesso profilo PerfectGym** del pass. Se su PerfectGym crei un profilo nuovo, il CRM non collega l'abbonamento alla prova e non la chiude da solo.

## L'esito si segna da solo
- **Iscritto**: quando su PerfectGym compare un abbonamento (non un altro pass, non un aggiuntivo) firmato fra l'inizio della prova e **30 giorni dopo la fine del pass**. Non si sceglie a mano.
- **Non iscritto**: da solo, 30 giorni dopo la fine del pass se l'abbonamento non c'è. Fino ad allora la prova resta fra le **Finite senza esito**, per richiamarla. Se sai già che non si iscrive, puoi chiuderla prima: Esito **Non iscritto** e **«Salva»**.

## Riaprire
Dalla scheda della persona, **«Riapri»**. Una prova chiusa da sola come **iscritta** non si riapre: l'abbonamento c'è. Una chiusa come **non iscritta** si riapre, e dopo il CRM non la richiude più da solo.
`,
}
