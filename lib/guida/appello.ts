import type { Argomento } from '.'

export const appello: Argomento = {
  chiave: 'appello',
  titolo: 'Appello',
  sezione: null,
  inBreve: 'L’istruttore vede chi ha prenotato le sue lezioni e segna le presenze; l’Appello complessivo mostra tutte le lezioni del giorno, con i filtri.',
  testo: `
## Appello istruttore
Ogni istruttore vede **solo le sue lezioni** e chi le ha prenotate, di **oggi e dei prossimi giorni**. Chi è l'istruttore lo dice l'**email**: il tuo utente del CRM deve avere la stessa email che hai su PerfectGym (se su PerfectGym non c'è l'email, vale lo stesso nome e cognome). Non c'è niente da collegare a mano.

- **Quando si segna la presenza**: da **59 minuti prima** dell'inizio fino a **59 minuti dopo** la fine della lezione. Prima e dopo si legge soltanto: il bollino sopra la lezione dice «Si apre alle ...», «Appello aperto fino alle ...» o «Appello chiuso».
- **Come si segna**: tocchi la riga di chi è presente («Segna presente»): diventa verde con **«✓ Presente»**. Se ti sbagli, tocchi di nuovo e confermi **«Sì, togli»**: vale finché l'appello è aperto.
- **Cosa vedi sotto il nome**: la data di nascita e l'età, chi ha segnato la presenza e a che ora (**«tornello/PG»** se arriva da PerfectGym) e tre pastiglie: **Prova** (ha un Guest Pass da 7 o 10 giorni in corso), **Nuovo iscritto** (nelle prime due settimane del suo primo abbonamento) e **First Timer** (è la sua prima volta a quel tipo di lezione). Sono le persone da seguire meglio.
- Vedono i prenotati: **non annullati e non in lista d'attesa**.
- Per guardare un giorno passato, scegli la data.

Il CRM rifiuta da solo una presenza fuori finestra o su una lezione che non è tua, e dice perché.

## Appello complessivo
**Tutte le lezioni di un giorno**, di tutti gli istruttori, con chi ha prenotato e chi è presente. Si filtra per **istruttore, lezione, categoria e sala**; in cima i numeri del giorno (lezioni, prenotati, presenti, percentuale di presenza sulle lezioni già iniziate). Il nome di chi ha prenotato apre la sua scheda in un'altra scheda del browser.

Lo vedono gli **admin** e i **consulenti**. Qui si **legge soltanto**: la presenza la segna l'istruttore dal suo appello.

## Dove vanno le presenze
Si salvano nel CRM. L'invio a PerfectGym è predisposto ma **ancora spento**: finché non viene acceso, su PerfectGym la presenza resta quella che c'era.
`,
}
