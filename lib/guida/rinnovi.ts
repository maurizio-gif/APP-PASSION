import type { Argomento } from '.'

export const rinnovi: Argomento = {
  chiave: 'rinnovi',
  titolo: 'Rinnovi e scadenze',
  sezione: 'rinnovi',
  inBreve: 'Gli abbonamenti che stanno per scadere: chi li segue, la telefonata 15 giorni prima, e l’esito rinnovato o non rinnovato.',
  testo: `
## Da dove arrivano
Da PerfectGym, da soli: ogni abbonamento **a termine** (pagato in un'unica soluzione: annuali, «N mesi», Reformer, percorsi con trainer) entra fra i rinnovi **30 giorni prima della scadenza**. Gli abbonamenti mensili con addebito non scadono: finiscono solo se il socio disdice, e allora sono una [disdetta](/dashboard/guida/disdette).

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
1. **15 giorni prima della scadenza, alle 10**, il CRM mette da solo un task a chi segue il rinnovo: una Telefonata, «L'abbonamento ... scade il ...: chiamare per il rinnovo». Non lo mette se l'abbonamento nuovo su PerfectGym c'è già.
2. Chiama e segna com'è andata sul task. Se va richiamato, programma un altro task.
3. Quando hai la risposta, sulla riga del rinnovo: **Esito** (**Rinnovato** o **Non rinnovato**), chi lo segue, le **Note**, e **«Salva»**.

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
