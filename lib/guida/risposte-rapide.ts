import type { Argomento } from '.'

export const risposteRapide: Argomento = {
  chiave: 'risposte-rapide',
  titolo: 'Risposte rapide',
  sezione: null,
  inBreve: 'Le domande che capitano più spesso, con la risposta in poche righe e il capitolo dove approfondire.',
  testo: `
## Lead
### Perché il lead non è diventato «Vinta» anche se si è iscritta?
Perché su PerfectGym la persona deve avere **la stessa email o lo stesso telefono** del lead. Se sono scritti diversi, il lead resta aperto. Vedi [Lead](/dashboard/guida/lead).

### Posso creare un lead per una persona che c'è già?
Sì, il nuovo lead si crea sempre, anche se ne ha già uno aperto. Per questo, prima di crearlo, **cercalo**.

### Come passo un lead a un collega?
Dalla riga o dalla scheda, la tendina e **«Assegna»**. Con **«Rimetti da assegnare»** torna fra i **Da gestire**, senza nessuno.

### Posso gestire il lead di un collega?
Solo se sei admin o hai l'autorizzazione **«Lead degli altri»**. Altrimenti lo gestisce lui.

### Come segno un lead come perso?
Dalla scheda della persona: **«Persa»**, con il motivo se vuoi. «Vinta» invece la segna il CRM da solo.

### Perché nell'elenco vedo al massimo 200 lead?
L'elenco mostra i 200 più recenti. Per trovarne uno più vecchio usa la ricerca.

## Prove
### Come segno l'esito di una prova?
Non si segna: **Iscritto** lo mette il CRM quando compare l'abbonamento, **Non iscritto** da solo 30 giorni dopo la fine del pass. Se sai già che non si iscrive puoi chiuderla prima, con **Non iscritto** e **«Salva»**. Vedi [Prove](/dashboard/guida/prove).

### Quali prove devo richiamare?
Quelle in **Finite senza esito**: il pass è finito e non c'è ancora un abbonamento.

### Cosa vuol dire «mai entrato»?
Ha il pass ma non è mai venuto. Chiamalo prima che il pass finisca.

### Perché una persona ha due prove?
Perché la richiesta e il pass hanno email o telefono diversi, e il CRM non li riconosce come la stessa persona.

### Perché la prova non si è chiusa dopo l'abbonamento?
L'abbonamento va fatto sullo **stesso profilo PerfectGym** del pass. Con un profilo nuovo, il CRM non lo collega alla prova.

## Rinnovi e disdette
### Rinnovo o disdetta?
Dipende dall'abbonamento. **A scadenza fissa** (Reformer 12 mesi, Percorsi «I ❤️ My Trainer», PT Elite): quando finisce è un **rinnovo**. **Mensile con addebito**: se il socio lo disdice è una **disdetta**. Vedi [Rinnovi](/dashboard/guida/rinnovi) e [Disdette](/dashboard/guida/disdette).

### Perché la disdetta ha già un task?
Il CRM lo crea appena la disdetta arriva, per oggi. Chi prende in carico la disdetta prende anche il task.

### L'esito del rinnovo si segna da solo?
No, mai: anche quando compare «Nuovo abbonamento su PerfectGym», va messo **Rinnovato** a mano.

### Quando entra un rinnovo nell'elenco?
Un abbonamento a scadenza fissa entra **30 giorni prima della fine**, ed è ancora recuperabile se è scaduto da non più di 30 giorni.

### Perché serve il motivo della disdetta?
Conta anche quando il socio non si recupera: da lì si capisce perché se ne vanno.

## Debitori
### Come esce un debitore dall'elenco?
Da solo, quando paga su PerfectGym: non c'è niente da chiudere a mano. Poi lo trovi fra i **Rientrati** per 90 giorni. Vedi [Debitori](/dashboard/guida/debitori).

### Perché non vedo un debitore con l'abbonamento scaduto?
La pagina si apre su **Abbonamento attivo**. Cerca sotto **Abbonamento scaduto** o **Tutti**.

## Task
### Che differenza c'è tra «Fatto ✓» e «Negativo»?
**Fatto ✓**: fatto, con esito positivo. **Negativo** (in home **Non risponde**): fatto, ma non è andata. Vedi [Task](/dashboard/guida/task).

### Come riapro un task chiuso?
Non si riapre: se va rifatto, programmane un altro.

### Perché un collega non compare nella tendina «A chi»?
Compare solo chi è **attivo**, ha **l'accesso** e ha la spunta **«Riceve lead e task»** in Utenti. Di solito manca una di queste tre cose.

## La persona e i ticket
### Dove cambio i dati di un socio (abbonamento, saldo, certificato)?
Su PerfectGym: nel CRM si leggono soltanto. Vedi [La scheda persona](/dashboard/guida/scheda-persona).

### Come cerco una persona?
Con la ricerca in cima al menu: nome, cognome, telefono o email, almeno due lettere. Il numero di socio di PerfectGym e il codice fiscale non si cercano.

### Cosa controllo prima di aprire un ticket?
L'abbonamento (è già iniziato?), il saldo, il certificato, il pacchetto o le lezioni, l'orario permesso. Vedi [Ticket](/dashboard/guida/ticket).

### Cosa faccio se qualcosa blocca il lavoro di tutti?
Apri il ticket con la spunta **«Blocca il lavoro di tutti»** e **chiama anche R2D**: il ticket da solo non avvisa nessuno.

## Accesso
### Ho dimenticato la password
Nella pagina di accesso: **«Password dimenticata?»**, scrivi l'email e **«Mandami il link»**. Se l'accesso non l'hai mai avuto, chiedi a un admin di invitarti.

### Perché non vedo una sezione?
Il menu mostra solo le sezioni che ti sono state date. Chiedila a un admin: si dà da Utenti. Vedi [Chi vede cosa](/dashboard/guida/accessi).
`,
}
