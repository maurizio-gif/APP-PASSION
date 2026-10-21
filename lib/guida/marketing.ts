import type { Argomento } from '.'

export const marketing: Argomento = {
  chiave: 'marketing',
  titolo: 'Marketing',
  sezione: 'marketing',
  inBreve: 'Da dove arrivano le opportunità, fin dove arrivano (hanno risposto, hanno attivato la prova, si sono iscritti) e come vengono lavorate. Per fonte, campagna, gruppo di inserzioni, modulo, attività e mese.',
  testo: `
## Chi la vede
La sezione **non la vede nessuno in automatico, nemmeno gli admin**: compare solo a chi la riceve. Si dà o si toglie da **Utenti**, con la spunta **Marketing** nella scheda di ogni persona.

## A cosa serve
Dice **quali fonti portano persone che si iscrivono**, non solo quante ne portano. Per ogni fonte, campagna o mese vedi quante opportunità sono arrivate e quanti hanno fatto ogni passo.

## I passi
1. **Opportunità**: le opportunità arrivate nel periodo che scegli. I doppioni non si contano.
2. **Qualificati**: hanno risposto. C'è un task fatto che **non** è «Negativo» (telefonata, WhatsApp, email o in sede). Chi è arrivato alla prova o all'iscrizione conta come qualificato anche se nessuno ha segnato la telefonata.
3. **Prova attivata** (facoltativa): ha il Pass su PerfectGym, o la sua prova ha un esito segnato. Chi ha solo **chiesto** il Pass e non l'ha attivato non conta, come in [Prove](/dashboard/prove).
4. **Iscritti**: l'opportunità è **Vinta · contratto**, cioè su PerfectGym compare il suo abbonamento. **«Di cui dopo prova»** sono gli iscritti che prima avevano fatto una prova.

La prova si può saltare: chi si iscrive direttamente conta fra gli iscritti senza passare dalle prove.

## Come si legge
- Le percentuali sono **sulle opportunità arrivate**: «13%» sotto i qualificati vuol dire che 13 opportunità su 100 hanno risposto.
- Si contano le opportunità **arrivate** nel periodo, e si guarda dove sono arrivati **fino a oggi**. Le opportunità di questi giorni hanno avuto poco tempo: guarda un periodo che finisce almeno un mese fa per confrontare le fonti.
- In alto scegli il periodo e, se vuoi, una sola fonte. Le schede sotto raggruppano le stesse opportunità in modi diversi.

## Come vengono gestiti
Con **«Come vengono gestiti»** in alto cambiano i numeri: invece del percorso, cosa succede all'opportunità quando qualcuno la lavora.
- **Nessuno li ha lavorati**: senza task né commenti, e senza prova né iscrizione.
- **Azioni per opportunità**: quanti task fatti e commenti, in media, per ogni opportunità lavorata.
- **Primo contatto**: il tempo tipico fra l'arrivo dell'opportunità e il primo task o commento.
- **Entro 24 ore**: le opportunità con la prima azione nel primo giorno.
- **Provati, mai risposto**: lavorati, ma la persona non ha mai risposto.
- **Persi** e **Ancora aperti**.

Come leggerli: tanti **«nessuno le ha lavorate»** e un primo contatto lento dicono che il problema è come si lavora l'opportunità. Tanti **«provate, mai risposto»** con tante azioni e un primo contatto rapido dicono che l'opportunità è stata inseguita ma non risponde: guarda la campagna.

> Fino ad aprile 2026 il task si segnava solo quando la persona rispondeva, e le chiamate senza risposta si scrivevano come commenti («nr»). Per questo un task fatto vale «ha risposto» e un commento vale «un tentativo». Da maggio 2026 ogni tentativo è un task, con esito Positivo o Negativo.

## Le schede
- **Fonte**: Sito, Tour / walk-in, Referral, Meta, Altro.
- **Campagna / dettaglio**: per Meta il nome della campagna; per il Sito il bottone da cui ha compilato il modulo; per gli altri il dettaglio scritto sull'opportunità.
- **Gruppo di inserzioni** e **Modulo Meta**: solo per le opportunità di Meta. «(non indicato)» sono le opportunità Meta arrivate senza questi dati.
- **Attività di interesse**: quello che la persona ha chiesto nel modulo.
- **Mese di arrivo**: come cambia il percorso mese dopo mese.

## Cosa fidarsi e cosa no
> I numeri valgono quanto il lavoro che si segna nel CRM. Se una telefonata non viene segnata (né come task né come commento), il lavoro non si vede.

- Il **Sito** parte dalla prova: quasi tutti chiedono il Pass, quindi quasi tutti risultano in prova.
- **Tour / walk-in** e **Referral** sono persone che spesso arrivano già decise: si iscrivono senza passare dalla prova.
- Un task «Negativo» vale sia «non risponde» sia «non interessato»: chi ha risposto e ha detto no non risulta qualificato (dal 2026 in poi).
- Il CRM non riceve ancora i dati tecnici delle campagne (source, medium, term): conosce la fonte, il dettaglio, e per Meta campagna, gruppo di inserzioni e modulo.
`,
}
