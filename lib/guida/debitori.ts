import type { Argomento } from '.'

export const debitori: Argomento = {
  chiave: 'debitori',
  titolo: 'Debitori',
  sezione: 'debitori',
  inBreve: 'I soci col saldo negativo su PerfectGym: chi segue il recupero, i solleciti come task, e l’uscita dall’elenco appena pagano.',
  testo: `
## Da dove arrivano
Il saldo non si scrive nel CRM: si legge da **PerfectGym** ogni volta che apri la pagina, e PerfectGym lo ricontrolla ogni 2 minuti e subito dopo ogni pagamento. Quando un socio va in negativo entra nell'elenco da solo; quando paga esce da solo e passa fra i **Rientrati**. In cima c'è il totale e quanti minuti fa sono stati controllati i saldi.

## I filtri
- **Abbonamento attivo** (si apre qui): chi ha un abbonamento in corso, sospeso o non ancora iniziato;
- **Abbonamento scaduto**: tutti gli altri;
- **Tutti**: attivi e scaduti insieme;
- **Rientrati**: chi ha pagato negli ultimi 90 giorni.

E di chi è il recupero: **Di tutti**, **I miei**, **Da assegnare**, o un collega con **Tutti i consulenti**. I più in negativo sono in cima.

> Si apre su **Abbonamento attivo**: chi ha l'abbonamento scaduto e un debito aperto è sotto **Abbonamento scaduto** o **Tutti**.

## Cosa vedi per ogni socio
- **Saldo**: quanto, da quando è in negativo, l'ultimo pagamento;
- **Abbonamento**: attivo o scaduto, il piano, lo stato e la fine;
- **Recupero**: chi lo segue, i task aperti con la data (in rosso se arretrati) e le loro note.

## Il lavoro
1. Prendi il recupero con **«Prendo in carico»**, o assegnalo con la tendina e **«Assegna»**.
2. Con **«+ Task»** programma il sollecito: il tipo (Telefonata, WhatsApp, Email, In sede), a chi, la data, cosa fare («sollecito», «piano di rientro»). Poi **«Aggiungi task»**. Se il recupero non lo seguiva nessuno, lo segue chi riceve il task.
3. Il task compare in [Task](/dashboard/task) e nella storia della persona: quando lo fai, segna com'è andata.
4. Quando il socio paga su PerfectGym, esce dall'elenco da solo. Non c'è niente da chiudere a mano.
`,
}
