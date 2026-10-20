import type { Argomento } from '.'

export const marketing: Argomento = {
  chiave: 'marketing',
  titolo: 'Marketing',
  sezione: 'marketing',
  inBreve: 'Da dove arrivano i lead e fin dove arrivano: hanno risposto, hanno attivato la prova, si sono iscritti. Per fonte, campagna, gruppo di inserzioni, modulo, attività e mese.',
  testo: `
## A cosa serve
Dice **quali fonti portano persone che si iscrivono**, non solo quante ne portano. Per ogni fonte, campagna o mese vedi quanti lead sono arrivati e quanti hanno fatto ogni passo.

## I passi
1. **Lead**: i lead arrivati nel periodo che scegli. I doppioni non si contano.
2. **Qualificati**: hanno risposto. Qualcuno ha segnato un task fatto con esito **Positivo** (telefonata, WhatsApp, email o in sede). Chi è arrivato alla prova o all'iscrizione conta come qualificato anche se nessuno ha segnato la telefonata.
3. **Prova attivata** (facoltativa): ha il Pass su PerfectGym, o la sua prova ha un esito segnato. Chi ha solo **chiesto** il Pass e non l'ha attivato non conta, come in [Prove](/dashboard/prove).
4. **Iscritti**: il lead è **Vinta · contratto**, cioè su PerfectGym compare il suo abbonamento. **«Di cui dopo prova»** sono gli iscritti che prima avevano fatto una prova.

La prova si può saltare: chi si iscrive direttamente conta fra gli iscritti senza passare dalle prove.

## Come si legge
- Le percentuali sono **sui lead arrivati**: «13%» sotto i qualificati vuol dire che 13 lead su 100 hanno risposto.
- Si contano i lead **arrivati** nel periodo, e si guarda dove sono arrivati **fino a oggi**. I lead di questi giorni hanno avuto poco tempo: guarda un periodo che finisce almeno un mese fa per confrontare le fonti.
- In alto scegli il periodo e, se vuoi, una sola fonte. Le schede sotto raggruppano gli stessi lead in modi diversi.

## Le schede
- **Fonte**: Sito, Tour / walk-in, Referral, Meta, Altro.
- **Campagna / dettaglio**: per Meta il nome della campagna; per il Sito il bottone da cui ha compilato il modulo; per gli altri il dettaglio scritto sul lead.
- **Gruppo di inserzioni** e **Modulo Meta**: solo per i lead di Meta. «(non indicato)» sono i lead Meta arrivati senza questi dati.
- **Attività di interesse**: quello che la persona ha chiesto nel modulo.
- **Mese di arrivo**: come cambia il percorso mese dopo mese.

## Cosa fidarsi e cosa no
> I numeri valgono quanto il lavoro che si segna nel CRM. Se una telefonata non viene segnata come task, il lead non risulta qualificato.

- Il **Sito** parte dalla prova: quasi tutti chiedono il Pass, quindi quasi tutti risultano in prova.
- **Tour / walk-in** e **Referral** sono persone che spesso arrivano già decise: si iscrivono senza passare dalla prova.
- Molti lead **Meta** sono stati chiusi come persi senza nessun task: i qualificati di Meta sono quindi più bassi di quelli veri.
- Il CRM non riceve ancora i dati tecnici delle campagne (source, medium, term): conosce la fonte, il dettaglio, e per Meta campagna, gruppo di inserzioni e modulo.
`,
}
