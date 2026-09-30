// Numeri e date come si leggono a Roma, qualunque sia il fuso del server.

const FUSO = 'Europe/Rome'

const euro = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })
const intero = new Intl.NumberFormat('it-IT')
const giornoOra = new Intl.DateTimeFormat('it-IT', {
  timeZone: FUSO, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
})
const soloOra = new Intl.DateTimeFormat('it-IT', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' })
const giornoLungo = new Intl.DateTimeFormat('it-IT', { timeZone: FUSO, weekday: 'long', day: 'numeric', month: 'long' })
const giornoSettimana = new Intl.DateTimeFormat('it-IT', {
  timeZone: FUSO, weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
})

export const formatoEuro = (v: number | null | undefined) => (v == null ? '—' : euro.format(v))
export const formatoNumero = (v: number | null | undefined) => (v == null ? '—' : intero.format(v))

// Come formatoNumero, ma con il punto delle migliaia anche sotto i 10.000
// ("2.382") e uguale sul server e nel browser: Intl li scrive in modo diverso,
// e un grafico disegnato da tutti e due deve dire la stessa cifra.
export function formatoCifra(v: number | null | undefined, decimali = 0) {
  if (v == null) return '—'
  const [interi, dec] = Math.abs(v).toFixed(decimali).split('.')
  const segno = v < 0 && Number(Math.abs(v).toFixed(decimali)) !== 0 ? '−' : ''
  return `${segno}${interi.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}${dec ? `,${dec}` : ''}`
}

// Un istante (timestamptz) -> "28/09/2026, 17:40".
export const formatoDataOra = (v: string | null | undefined) => (v ? giornoOra.format(new Date(v)) : '—')
export const formatoOra = (v: string | null | undefined) => (v ? soloOra.format(new Date(v)) : '—')
// Un istante -> "mar 29/09/2026", il giorno a Roma.
export const formatoGiorno = (v: string | null | undefined) => (v ? giornoSettimana.format(new Date(v)) : '—')

// Una data secca ("2026-09-28", o l'inizio di una data-ora) -> "28/09/2026".
// Si legge la parte scritta: passare da Date la sposterebbe col fuso.
export function formatoData(v: string | null | undefined) {
  if (!v) return '—'
  const [a, m, g] = v.slice(0, 10).split('-')
  return g && m && a ? `${g}/${m}/${a}` : v
}

// "2026-09-28" -> "lunedì 28 settembre". Mezzogiorno UTC: lo stesso giorno a Roma.
export const formatoGiornoLungo = (giorno: string) => giornoLungo.format(new Date(`${giorno}T12:00:00Z`))

// Oggi a Roma, "AAAA-MM-GG".
export function oggiRoma() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO }).format(new Date())
}

export function spostaGiorno(giorno: string, giorni: number) {
  const d = new Date(`${giorno}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + giorni)
  return d.toISOString().slice(0, 10)
}

export const eGiornoValido = (v: string | undefined): v is string => Boolean(v && /^\d{4}-\d{2}-\d{2}$/.test(v))

// "5 minuti fa", "ieri"... per le date recenti del mirror.
export function formatoFa(v: string | null | undefined) {
  if (!v) return 'mai'
  const secondi = Math.round((Date.now() - new Date(v).getTime()) / 1000)
  if (secondi < 60) return 'adesso'
  const minuti = Math.round(secondi / 60)
  if (minuti < 60) return `${minuti} min fa`
  const ore = Math.round(minuti / 60)
  if (ore < 24) return `${ore} h fa`
  const giorni = Math.round(ore / 24)
  return giorni === 1 ? 'ieri' : `${giorni} giorni fa`
}

// I valori di PerfectGym, in italiano.
export const TIPO_SOCIO: Record<string, string> = { Member: 'Socio', Lead: 'Lead', Guest: 'Ospite' }
export const STATO_CONTRATTO: Record<string, string> = {
  Current: 'In corso', Ended: 'Terminato', NotStarted: 'Non iniziato', Cancelled: 'Annullato',
}
export const TIPO_ADDEBITO: Record<string, string> = {
  Membership: 'Canone', AdminFee: 'Quota amministrativa', Prorata: 'Pro rata', Freeze: 'Sospensione',
  JoiningFee: 'Quota di iscrizione', Manual: 'Manuale',
}

export const traduci = (tabella: Record<string, string>, v: string | null | undefined) => (v ? tabella[v] ?? v : '—')

export function nomeCompleto(nome: string | null | undefined, cognome: string | null | undefined) {
  return [nome, cognome].filter(Boolean).join(' ') || 'Senza nome'
}

// Le etichette del CRM.
export const FONTE: Record<string, string> = {
  sito: 'Sito', tour: 'Tour / walk-in', referral: 'Referral', meta: 'Meta', altro: 'Altro',
}
export const FASE: Record<string, string> = {
  da_gestire: 'Da gestire', in_gestione: 'In gestione', vinta: 'Vinta', persa: 'Persa',
}
export const TIPO_TASK: Record<string, string> = {
  telefonata: 'Telefonata', in_sede: 'In sede', whatsapp: 'WhatsApp', email: 'Email',
  richiamare: 'Richiamare', appuntamento: 'Appuntamento',
}
// I tipi che si scelgono per un task nuovo. «Richiamare» e «Appuntamento»
// restano solo per i task che l'hanno gia' (lo storico): erano doppioni di
// Telefonata e In sede, che si programmano o si registrano.
const SOLO_STORICO = ['richiamare', 'appuntamento']
export const TIPI_TASK_NUOVI = Object.entries(TIPO_TASK).filter(([k]) => !SOLO_STORICO.includes(k))
// Da dove viene un task: la dicitura accanto al task, in Task, in home e nella scheda.
export const ORIGINE_TASK: Record<string, string> = {
  lead: 'Lead', prova: 'Scadenza pass', rinnovo: 'Rinnovo', disdetta: 'Disdetta', debito: 'Debito',
}
export const CONTROLLO: Record<string, string> = {
  da_controllare: 'Da controllare', in_corso: 'In corso', errore: 'Errore', controllato: 'Controllato',
}
export const TESSERAMENTO: Record<string, string> = { si: 'Tesserato', gia_presente: 'Già presente', no: 'Non tesserato' }
export const ESITO_RINNOVO: Record<string, string> = { rinnovato: 'Rinnovato', non_rinnovato: 'Non rinnovato' }
export const ESITO_DISDETTA: Record<string, string> = { vinto: 'Recuperato', perso: 'Perso', standby: 'In sospeso' }

// I ticket (supabase/migrations/20260930a_ticket.sql).
export const TIPO_TICKET: Record<string, string> = {
  guasto: 'Qualcosa non funziona', domanda: 'Domanda', attivita: 'Attività', proposta: 'Proposta di modifica',
  modifica: 'Modifica',
}
// Quello che il desk sceglie aprendo, con la riga che spiega quando usarlo.
export const TIPI_TICKET_NUOVI: { chiave: string; testo: string; spiega: string }[] = [
  { chiave: 'guasto', testo: 'Qualcosa non funziona', spiega: 'un socio non entra, non prenota, un pagamento o un’automazione che non va' },
  { chiave: 'domanda', testo: 'Domanda', spiega: 'come si fa qualcosa su PerfectGym, sul CRM, sull’app' },
  { chiave: 'attivita', testo: 'Attività da fare', spiega: 'una newsletter, il planning sul sito, un account, un’estrazione di dati' },
  { chiave: 'proposta', testo: 'Proposta di modifica', spiega: 'un prezzo, una regola, un prodotto nuovo: si decide nella riunione settimanale' },
]
export const STATO_TICKET: Record<string, string> = {
  da_verificare: 'Da verificare', inviato: 'Inviato a R2D', in_lavorazione: 'In lavorazione', in_attesa: 'Aspetta Passion',
  risolto: 'Risolto', risolto_desk: 'Risolto al desk', doppione: 'Unito',
  da_confermare: 'Da confermare', confermata: 'Confermata', rilasciata: 'Rilasciata', annullata: 'Annullata',
}
export const STATI_TICKET_CHIUSI = ['risolto', 'risolto_desk', 'doppione', 'rilasciata', 'annullata']
// Di che cosa si trattava: le categorie dell'analisi dei ticket del 30/09/2026.
export const NATURA_TICKET: Record<string, string> = {
  errore_configurazione: 'Errore di configurazione o automazione (R2D)',
  guasto_terze_parti: 'Guasto di terze parti (PerfectGym, app, tornelli)',
  funziona_come_impostato: 'Il sistema funzionava come impostato',
  errore_operativo: 'Errore operativo del desk',
  problema_socio: 'Problema lato socio (telefono, email, banca)',
  domanda: 'Domanda su come si fa',
  attivita: 'Attività operativa',
  richiesta_modifica: 'Richiesta di modifica (va in riunione)',
}
// I controlli prima di aprire un guasto: la checklist dell'analisi.
export const VERIFICHE_TICKET: Record<string, string> = {
  contratto_iniziato: 'L’abbonamento è già iniziato',
  saldo: 'Il socio non è in debito (o il pagamento è in corso)',
  certificato: 'Il certificato medico è valido',
  pacchetto: 'Il pacchetto o le lezioni non sono scaduti',
  regola_accesso: 'L’abbonamento permette quell’orario o quella lezione',
  app_riavviata: 'Telefono riavviato e app reinstallata',
}
// I passaggi nel filo del ticket.
export const EVENTO_TICKET: Record<string, string> = {
  aperto: 'ha aperto il ticket', aperto_inviato: 'ha aperto il ticket e l’ha mandato a R2D',
  inviato: 'l’ha mandato a R2D', risolto_desk: 'l’ha risolto al desk', unito: 'l’ha unito a un altro ticket',
  unito_qui: 'ha unito qui un altro ticket', riaperto: 'l’ha riaperto', preso: 'l’ha preso in carico',
  in_attesa: 'chiede informazioni a Passion', risposta_passion: 'ha risposto: torna in lavorazione',
  risolto: 'l’ha risolto', modifica_scritta: 'ha scritto la modifica', modifica_corretta: 'ha corretto la modifica',
  confermata: 'ha registrato la conferma', rilasciata: 'l’ha rilasciata', annullata: 'l’ha annullata',
}

// I motivi di disdetta, gli stessi a cui si e' ricondotto lo storico.
export const MOTIVI_DISDETTA = [
  'Cambio contratto', 'Trasferimento', 'Malattia/Infortunio', 'Mancanza di tempo', 'Prezzo',
  'Mancanza di motivazione', 'Fine contratto', "Attivita' mancante", "Qualita' delle lezioni",
  'Chiuso dal management', 'Cessione del contratto', 'Non raggiungibile', 'Altro',
]

// Per un campo datetime-local: "AAAA-MM-GGTHH:MM" nell'ora di Roma.
export function perInputDataOra(d: Date) {
  const p = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(d)
  return p.replace(' ', 'T')
}

// Il valore di un datetime-local e' l'ora di Roma: lo si trasforma in un istante.
export function daInputDataOra(v: string | null | undefined): string | null {
  if (!v) return null
  const [giorno, ora] = v.split('T')
  if (!giorno || !ora) return null
  const tentativo = new Date(`${giorno}T${ora}:00Z`)
  // Lo scarto fra UTC e Roma in quel momento (1 o 2 ore).
  const roma = new Date(tentativo.toLocaleString('en-US', { timeZone: 'Europe/Rome' }))
  const utc = new Date(tentativo.toLocaleString('en-US', { timeZone: 'UTC' }))
  return new Date(tentativo.getTime() - (roma.getTime() - utc.getTime())).toISOString()
}

export function telefonoLink(t: string | null | undefined) {
  return t ? `tel:${t.replace(/[^\d+]/g, '')}` : null
}
