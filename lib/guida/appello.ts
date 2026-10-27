import type { Argomento } from '.'

// La guida dell'appello, scritta per l'istruttore: come si fa l'appello, cosa vuol
// dire ogni segnale e perche' chi passa dal tornello e' gia' presente. Le regole
// stanno nel database (supabase/migrations/20261027i_appello.sql e 20261027k_appello_segnali.sql):
// se cambiano, si corregge qui.
export const appello: Argomento = {
  chiave: 'appello',
  titolo: 'Appello',
  sezione: null,
  inBreve: 'Come fare l’appello delle tue lezioni: quando si segna, cosa fa il tornello, e cosa vogliono dire First Timer, Prova e Nuovo iscritto.',
  testo: `
> **Prima di cominciare, guarda il video-tutorial** (46 secondi): è in cima alla pagina **Appello istruttore**, nella scheda «Guarda il tutorial».

## A cosa serve
In **Appello istruttore** vedi **solo le tue lezioni** e chi le ha prenotate, di oggi e dei prossimi giorni. Ti serve per sapere **chi arriva** (e chi è nuovo, per seguirlo meglio) e per **confermare chi c'è davvero**.

Ci entri con l'utente del CRM: il CRM ti riconosce dall'**email**, la stessa che hai su PerfectGym. Se non vedi le tue lezioni, chiedi a un admin di controllare l'email.

## Come funziona un appello
1. Apri **Appello istruttore**: le lezioni sono in ordine di orario. Quelle già finite stanno sopra, la riga rossa **«Adesso»** divide il passato dal resto.
2. Ogni lezione ha l'**orario**, il nome, la sala e il conto **presenti/prenotati** (per esempio 8/12).
3. **Tocca la riga di chi è presente**: da «Segna presente» diventa verde con **«✓ Presente»**. Una riga, un tocco.
4. Se hai segnato per sbaglio, **tocca di nuovo la riga verde**: il CRM chiede **«Sì, togli»** (è una correzione, quindi chiede conferma).

Vedi i **prenotati**: chi ha annullato la prenotazione, o è solo in lista d'attesa, non compare. Chi si presenta **senza prenotazione** non è nell'elenco: avvisa la reception.

## Quando puoi segnare
La presenza si segna **da 59 minuti prima dell'inizio fino a 59 minuti dopo la fine** della lezione. Prima e dopo i nomi si **leggono e basta**:

- **Si segna dalle HH:MM**: la lezione non è ancora aperta (ma vedi già chi ha prenotato, anche dei prossimi giorni);
- **Appello aperto fino alle HH:MM**: puoi segnare;
- **Appello chiuso**: è passata la finestra, solo lettura.

Se provi a segnare fuori orario o una lezione che non è tua, il CRM non salva e ti dice perché.

## Il tornello: chi passa è già presente
**Chi passa dal tornello risulta già presente**, senza che tu faccia niente: la sua riga è **verde** e sotto il nome c'è scritto **«tornello/PG»** (il passaggio arriva da PerfectGym).

- Non devi segnarlo di nuovo: l'appello è già fatto per lui.
- Tocca **solo le righe ancora vuote**: sono quelle di chi non ha ancora passato il tornello (o non è stato letto) ma è in sala.
- Se qualcuno risulta presente dal tornello ma **non è in lezione**, puoi togliere la presenza (chiede conferma).
- Le presenze che segni tu mostrano **chi le ha segnate e a che ora** (per esempio «Stella L. 18:05»).

Così alla fine nell'appello c'è tutto: chi è passato dal tornello e chi hai aggiunto tu.

## I segnali sotto il nome
Sono le persone **da seguire meglio**. Le pastiglie le assegna il CRM da solo; ne può avere più di una insieme (un Guest Pass alla sua prima lezione è sia Prova sia First Timer). Sotto il nome vedi anche la **data di nascita e l'età**.

- **First Timer**: è la **prima volta** che fa **quel tipo di lezione** (per esempio Pilates, Reformer PLUS, HYROX), non la prima in assoluto. Il CRM controlla se prima di oggi ha già una prenotazione confermata dello stesso tipo: se non c'è, è un First Timer. Un'altra lezione (un altro tipo) non cambia niente: la stessa persona può essere First Timer al Pilates e non all'HYROX che fa da mesi. Chi aveva prenotato e non è venuto conta come «già passato».
- **Prova**: ha un **Guest Pass in corso**, da **7 o 10 giorni** (o un pass giornaliero), valido il giorno della lezione. Fermandoti sulla pastiglia vedi il nome del pass e fino a quando dura. Non è ancora un abbonato: è una persona da far trovare bene.
- **Nuovo iscritto**: è nelle **prime due settimane** del suo **primo abbonamento** (14 giorni dall'inizio). Chi rinnova o cambia abbonamento **non** lo è: conta solo il primo in assoluto, anche quello del vecchio gestionale.

Che fare con loro: spiega come si usa la sala o l'attrezzo, controlla la postura nei primi esercizi e chiedi come si è trovato. È un invito, non un obbligo: serve a non lasciare indietro chi è alla prima volta.

## Se qualcosa non torna
- **Non vedo le mie lezioni**: l'email del tuo utente deve essere uguale a quella che hai su PerfectGym. Se su PerfectGym non hai l'email, vale lo stesso nome e cognome. Chiedi a un admin.
- **Non riesco a segnare**: controlla la fascia («Si segna dalle…», «Appello chiuso»). Se la lezione è tua e sei dentro la fascia, ricarica la pagina.
- **Un nome è verde ma non c'è**: toccalo e conferma **«Sì, togli»**.
- **Manca qualcuno che è in sala**: se non era prenotato non compare; dillo alla reception.

## Dove va la presenza
La presenza che segni si salva nel **CRM**. L'invio a PerfectGym è in preparazione: quando sarà acceso, questa guida lo dirà.
`,
}
