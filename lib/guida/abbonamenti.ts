import type { Argomento } from '.'

export const abbonamenti: Argomento = {
  chiave: 'abbonamenti',
  titolo: 'La dashboard Abbonamenti',
  sezione: 'abbonamenti',
  inBreve: 'I numeri del club letti da PerfectGym: quanti iscritti, quanti nuovi, quanti non rinnovano, quanti restano, e quante prove diventano abbonamento.',
  testo: `
## Cosa mostra
I numeri si leggono da PerfectGym ogni volta che apri la pagina: sono sempre aggiornati e non si modificano da qui.

- **Abbonamenti attivi** e **Pass attivi** oggi, contro lo stesso giorno di uno e due anni fa;
- sugli ultimi 24 mesi: **Abbonamenti attivi a fine mese**, **Nuovi abbonamenti** (senza i rinnovi), **Scaduti e non rinnovati** entro 30 giorni e il **Saldo del mese** fra nuovi e persi;
- **Retention**: degli iscritti di un giorno, quanti lo erano anche lo stesso giorno dell'anno prima, senza interruzioni;
- **Pass di prova: quanti diventano abbonamento**, per persona, durante la prova o entro 30 giorni;
- **Quanto durano** gli abbonamenti, per tipo (senza scadenza, mensili, quadrimestrali, annuali).

Sul telefono i grafici scorrono di lato; toccando una colonna si apre il riquadro con i numeri del mese.

## Come si contano
- **Abbonamento**: un contratto principale (non aggiuntivo) con un canone. I certificati e i pacchetti aggiuntivi non contano.
- **Rinnovo**: un abbonamento che parte mentre la persona ne ha già uno, o entro 30 giorni dalla fine del precedente. Contano anche i vecchi piani «OLD».
- **Pass di prova**: un piano che si chiama pass, prova o guest, senza gli aggregatori (Fitprime, Gympass, Wellhub). Si contano le persone: due pass della stessa persona a meno di 30 giorni sono una prova sola, e non conta chi era già abbonato.
- **Durata**: abbonamenti della stessa persona senza più di 30 giorni di vuoto sono una permanenza sola, anche se cambia piano.

> Gli abbonamenti a pagamento su PerfectGym partono da luglio 2024: prima i soci erano quasi tutti sui piani OLD, e il confronto con due anni fa lo dice.

## Chi la vede
Sono i numeri dell'azienda: la vedono gli admin e chi la riceve apposta da Utenti.
`,
}
