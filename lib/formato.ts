// Numeri e date come si leggono a Roma, qualunque sia il fuso del server.

const FUSO = 'Europe/Rome'

const euro = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })
const intero = new Intl.NumberFormat('it-IT')
const giornoOra = new Intl.DateTimeFormat('it-IT', {
  timeZone: FUSO, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
})
const soloOra = new Intl.DateTimeFormat('it-IT', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' })
const giornoLungo = new Intl.DateTimeFormat('it-IT', { timeZone: FUSO, weekday: 'long', day: 'numeric', month: 'long' })

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
export const CONTROLLO: Record<string, string> = {
  da_controllare: 'Da controllare', in_corso: 'In corso', errore: 'Errore', controllato: 'Controllato',
}
export const TESSERAMENTO: Record<string, string> = { si: 'Tesserato', gia_presente: 'Già presente', no: 'Non tesserato' }
export const ESITO_RINNOVO: Record<string, string> = { rinnovato: 'Rinnovato', non_rinnovato: 'Non rinnovato' }
export const ESITO_DISDETTA: Record<string, string> = { vinto: 'Recuperato', perso: 'Perso', standby: 'In sospeso' }

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
