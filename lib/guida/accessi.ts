import type { Argomento } from '.'

export const accessi: Argomento = {
  chiave: 'accessi',
  titolo: 'Chi vede cosa',
  sezione: null,
  inBreve: 'I ruoli, le sezioni e le autorizzazioni: perché due colleghi non vedono lo stesso menu, e come si entra la prima volta.',
  testo: `
## I ruoli
Ognuno nel CRM ha un ruolo. Il tuo è scritto in fondo al menu, accanto al tuo nome (per i consulenti non c'è scritto niente).

- **Consulente**: il desk. Vede le sezioni che gli sono state date in Utenti, e fa quello che permettono le sue autorizzazioni.
- **Admin**: i responsabili. Vede tutte le sezioni e ha tutte le autorizzazioni. I suoi ticket passano dal supporto come quelli di tutti.
- **Admin + supporto**: come un admin, e in più riceve i ticket aperti dagli altri: li verifica, risponde, li unisce o li manda a R2D.
- **Superadmin**: R2D. Vede e può tutto, lavora e chiude i ticket, scrive le modifiche decise in riunione.

## Le sezioni
Il menu mostra solo le sezioni che puoi vedere: Lead, Prove, Disdette, Rinnovi, Task, Cerca, Debitori, Abbonamenti, Ticket. La home (**Da gestire**), la **scheda persona** e questa **Guida** le vedono tutti. Se ti manca una sezione che ti serve, chiedila a un admin: si dà da Utenti.

La sezione **Abbonamenti** ha i numeri dell'azienda: la vedono gli admin e chi la riceve apposta.

I **Report riunioni** li vedono solo superadmin e admin: in ogni report il riepilogo, le decisioni, i passaggi successivi con il loro stato (lo aggiornano loro) e la trascrizione completa, da aprire o scaricare.

## Le autorizzazioni
Oltre alle sezioni, due permessi in più, che si danno uno per uno:

- **Lead degli altri**: riassegnare e chiudere anche i lead, le disdette e i rinnovi in carico a un altro operatore. Senza, quelli in carico a un collega li gestisce solo lui (o un admin);
- **Gestione utenti**: aprire Utenti e cambiare sezioni e autorizzazioni degli altri.

Un admin le ha tutte e due d'ufficio.

## Chi riceve lead e task
Nelle tendine «A chi», «Assegnata a» e nei filtri per operatore compare solo chi è **attivo**, ha **l'accesso** (invitato o già entrato) e ha la spunta **«Riceve lead e task»** in Utenti. Se un collega non compare fra quelli a cui assegnare, di solito manca una di queste tre cose.

## Entrare la prima volta
1. Un admin (o chi ha Gestione utenti) ti crea da **Utenti → Nuovo utente**, con la tua email.
2. Ti arriva un'email con il link: scegli la password (**«Nuova password»**, **«Ripetila»**, **«Salva e entra»**).
3. Dopo, si entra con email e password.

Se hai dimenticato la password: nella pagina di accesso **«Password dimenticata?»**, scrivi l'email e **«Mandami il link»**. Il link arriva solo a chi l'accesso ce l'ha già; se non l'hai mai avuto, chiedi a un admin di invitarti (dalla tua scheda in Utenti può rimandare l'invito).

## Utenti (per chi li gestisce)
Da **Utenti**, per ogni operatore:

- il **ruolo**, l'accesso (**Attivo**) e **«Riceve lead e task»**;
- le **sezioni** e le **autorizzazioni**, se è consulente (un admin le ha tutte: le spunte sono ferme);
- **«Manda invito»**, o **«Manda link password»** a chi l'accesso ce l'ha già;
- **«Rimuovi utente»**: il suo lavoro aperto (lead, task, debitori, rinnovi) passa al collega scelto, o torna da assegnare. Nella storia del CRM resta il suo nome.

> Nessuno cambia il proprio ruolo né si toglie l'accesso da solo. I ruoli admin e supporto li dà solo un admin; il ruolo superadmin solo un superadmin.
`,
}
