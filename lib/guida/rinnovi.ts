import type { Argomento } from '.'

export const rinnovi: Argomento = {
  chiave: 'rinnovi',
  titolo: 'Rinnovi e scadenze',
  sezione: 'rinnovi',
  inBreve: 'Gli abbonamenti a scadenza fissa (Reformer, percorsi con trainer) che stanno per finire: da dove arrivano, la telefonata 15 giorni prima, e l’esito rinnovato o non rinnovato.',
  testo: `
## Rinnovo o disdetta?
A Passion ci sono due tipi di abbonamento, e ognuno finisce in un modo suo:

- **a scadenza fissa**: si pagano in un'unica soluzione, non si rinnovano da soli e nascono già con la data di fine. Sono soprattutto i **Reformer 12 mesi**, i **Percorsi «I ❤️ My Trainer»** e il **PT Elite**, comprese le versioni vecchie di questi piani che non si vendono più ma hanno ancora soci dentro. Quando finiscono, sono un **rinnovo**;
- **mensili con addebito** (Sala Pesi, Corsi Fitness, Open, Formula 8, con durata minima di 4 o 12 mesi o Flex): vanno avanti da soli finché il socio non disdice. Quando disdice, è una [disdetta](/dashboard/guida/disdette).

## Da dove arrivano
Da **PerfectGym**, da soli, ogni 5 minuti: niente si inserisce a mano.

- Un abbonamento a scadenza fissa entra fra i rinnovi **30 giorni prima della fine**, così la telefonata dei 15 giorni arriva in tempo.
- Entra anche se è **scaduto da non più di 30 giorni**: chi non ha rinnovato si può ancora recuperare.
- **Non entra** se su PerfectGym la persona ha già l'abbonamento nuovo: non c'è niente da fare.

> Il rinnovo arriva **senza nessuno che lo segua**: anche la sua telefonata automatica resta senza assegnatario finché non lo assegni. Chi segue i rinnovi li controlla in **Da gestire** e li assegna subito.

## Le viste
- **Da gestire**: senza esito, in ordine di scadenza (prima quelli scaduti da più tempo);
- **Rinnovati**, **Non rinnovati**, **Tutti**.

Con **Tutti i consulenti** vedi quelli di un collega.

## Cosa vedi per ogni rinnovo
- il **socio**, i contatti e il link a PerfectGym;
- l'**abbonamento**: piano, valore, **scade il ...**, lo stato del contratto;
- **«Nuovo abbonamento su PerfectGym»**: la persona ha già fatto l'abbonamento nuovo. Va solo segnato come rinnovato;
- quanti **task aperti** ha la persona.

## Il lavoro
1. Assegna il rinnovo a chi lo deve seguire (la tendina con l'operatore, poi **«Salva»**).
2. **15 giorni prima della scadenza, alle 10**, il CRM mette da solo un task a chi segue il rinnovo: una Telefonata, «L'abbonamento ... scade il ...: chiamare per il rinnovo». Se il rinnovo è arrivato più tardi (già scaduto, o a meno di 15 giorni), il task è per subito. Non lo mette se l'abbonamento nuovo su PerfectGym c'è già.
3. Chiama e segna com'è andata sul task. Se va richiamato, programma un altro task.
4. Quando hai la risposta, sulla riga del rinnovo: **Esito** (**Rinnovato** o **Non rinnovato**), chi lo segue, le **Note**, e **«Salva»**.

> L'esito del rinnovo **non si segna da solo**: anche quando compare «Nuovo abbonamento su PerfectGym», va messo **Rinnovato** a mano.

## Chi lo segue
La tendina con l'operatore sceglie chi segue il rinnovo e riceve i suoi task. Se non c'è nessuno, parte da te: controlla che sia la persona giusta prima di salvare.

## Le altre scadenze
- **Il pass di prova**: vedi [Prove](/dashboard/guida/prove), con la telefonata due giorni prima della fine;
- **il certificato medico**: nella scheda della persona, sotto nome e contatti: attivo con la scadenza, scaduto, o non presente;
- **il saldo negativo**: vedi [Debitori](/dashboard/guida/debitori).

Dalla scheda della persona il rinnovo si gestisce anche sul posto (**«Salva il rinnovo»**), e con **«Riapri»** si toglie l'esito.
`,
}
