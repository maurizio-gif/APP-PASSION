import type { Argomento } from '.'

export const ticket: Argomento = {
  chiave: 'ticket',
  titolo: 'Ticket di assistenza',
  sezione: 'ticket',
  inBreve: 'Quando qualcosa non funziona o serve R2D: prima i controlli, poi il ticket nel CRM. Il supporto lo verifica, R2D risponde nel filo.',
  testo: `
## Prima di aprire un ticket
Tanti problemi si risolvono al desk in un minuto. Se riguarda un socio che non entra o non prenota, apri la sua scheda e controlla:

- **l'abbonamento è già iniziato?** Uno firmato oggi con inizio fra qualche giorno non fa ancora entrare;
- **il socio non è in debito**, o il pagamento è in corso;
- **il certificato medico è valido**: nella scheda, sotto nome e contatti;
- **il pacchetto o le lezioni non sono scaduti**;
- **l'abbonamento permette quell'orario o quella lezione**;
- **telefono riavviato e app reinstallata**, se il problema è sull'app.

Se sulla persona c'è già un ticket aperto per lo stesso problema, non aprirne un altro: scrivi in quello.

> Se qualcosa blocca il lavoro di tutti (tornello, app giù, pagamenti), apri il ticket spuntando «Blocca il lavoro di tutti» e **chiama anche R2D**: il ticket da solo non avvisa nessuno.

## Aprire un ticket
Se riguarda un socio, aprilo dalla sua scheda con **«+ Apri un ticket»**: il ticket si porta dietro la sua situazione di quel momento (abbonamento, saldo, certificato, ultimi ingressi, prenotazioni) e R2D non te la deve chiedere. Altrimenti da [Ticket](/dashboard/ticket), **«+ Nuovo ticket»**.

1. Scegli **che cosa serve**:
  - **Qualcosa non funziona**: un socio non entra, non prenota, un pagamento o un'automazione che non va;
  - **Domanda**: come si fa qualcosa su PerfectGym, sul CRM, sull'app;
  - **Attività da fare**: una newsletter, il planning sul sito, un account, un'estrazione di dati;
  - **Proposta di modifica**: un prezzo, una regola, un prodotto nuovo. Non va a R2D: si decide nella riunione settimanale.
2. **In breve**: una riga che si capisca da sola («Non genera il QR code», «Non prenota il Reformer delle 18»).
3. **Cosa succede**: cosa hai visto, da quando, cosa compare sullo schermo, cosa hai già provato.
4. Per un guasto, spunta **cosa hai già controllato**.
5. **«Apri il ticket»**. Nella pagina che si apre aggiungi foto, video o PDF (fino a 25 MB l'uno): uno screenshot dell'errore vale più di tante parole.

## Dove va il ticket
- Resta **Da verificare** finché il supporto non lo guarda. Il supporto può:
  - **mandarlo a R2D**;
  - **risolverlo al desk**, con la risposta e di che cosa si trattava;
  - **unirlo** a un ticket già aperto sullo stesso problema.
- I ticket aperti dal supporto, e quelli di R2D, vanno subito a R2D. Quelli di un admin passano dal supporto come tutti.
- Le **proposte di modifica** aspettano la riunione settimanale: il supporto le chiude con quello che si è deciso.

## Seguire la risposta
Tutto passa dal **filo** del ticket: i messaggi di Passion e di R2D, e ogni passaggio (inviato, preso in carico, risolto). Per aggiungere qualcosa scrivi in «Scrivi» e **«Aggiungi al filo»**.

- Quando R2D ha bisogno di un'informazione, il ticket va in **Aspetta Passion**. Lo trovi nella vista **«Aspettano Passion»** e in home, nel riquadro **«Ticket in attesa»**. Rispondi nel filo: alla prima risposta torna in lavorazione.
- R2D chiude il ticket con **di che cosa si trattava, la causa e la soluzione**: le trovi in cima alla pagina del ticket.
- Se il problema si ripresenta, il supporto (o R2D) lo **riapre** con il motivo. Non aprirne uno nuovo.

## Le viste
- **Da verificare**: le segnalazioni che il supporto deve ancora guardare;
- **Da R2D**: mandate a R2D e in lavorazione;
- **Aspettano Passion**: R2D aspetta una risposta dal desk;
- **Modifiche**: le modifiche decise in riunione, da confermare o da rilasciare;
- **Aperti da me**: i tuoi ticket non ancora chiusi;
- **Chiusi**: gli ultimi 90 giorni;
- **Resoconto**: mese per mese, quanti ticket, di che tipo e come si sono chiusi.

## Le modifiche
Le modifiche (un prezzo, una regola, un piano) non si chiedono con un ticket: nascono nella **riunione settimanale** con R2D. R2D le scrive, una per modifica (cosa cambia, per quali abbonamenti, da quando, cosa si dice ai soci). Poi registra la conferma del titolare e, dopo il rilascio, cosa ha verificato prima e dopo. Stati: **Da confermare**, **Confermata**, **Rilasciata** (o **Annullata**).
`,
}
