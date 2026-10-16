// La ricerca per nome, cognome, telefono ed email nelle liste che il database
// non filtra per testo (Prove, Rinnovi, Disdette, Task, Debitori): si cerca nelle
// righe gia' arrivate, cioe' dentro la scheda aperta. Niente di nuovo dal database.

type Cercabile = { nome?: string | null; cognome?: string | null; telefono?: string | null; email?: string | null }

// Minuscolo e senza accenti, cosi' «Rossì» trova «rossi».
const norma = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const cifre = (s: string) => s.replace(/\D/g, '')

// Il testo cercato dai parametri della pagina, ripulito (null se vuoto).
export const testoCercato = (q: string | undefined) => q?.trim().slice(0, 80) || null

// Ogni parola cercata deve comparire in nome, cognome, email o telefono
// (il telefono anche scritto con spazi o trattini).
export function filtraTesto<T extends Cercabile>(righe: T[], q: string | null): T[] {
  if (!q) return righe
  const parole = norma(q).split(/\s+/).filter(Boolean)
  return righe.filter((r) => {
    const testo = norma([r.nome, r.cognome, r.email].filter(Boolean).join(' '))
    const tel = cifre(r.telefono ?? '')
    return parole.every((p) => testo.includes(p) || (cifre(p).length >= 3 && tel.includes(cifre(p))))
  })
}

// Nei ticket si cerca nelle righe gia' arrivate: numero (anche «#214»), titolo,
// cliente (nome e cognome), chi l'ha aperto e chi l'ha preso in carico.
type CercabileTicket = { id: number; titolo: string; nome?: string | null; cognome?: string | null; aperto_da_nome?: string | null; preso_nome?: string | null }

export function filtraTicket<T extends CercabileTicket>(righe: T[], q: string | null): T[] {
  if (!q) return righe
  const parole = norma(q).replace(/#/g, '').split(/s+/).filter(Boolean)
  return righe.filter((r) => {
    const testo = norma([String(r.id), r.titolo, r.nome, r.cognome, r.aperto_da_nome, r.preso_nome].filter(Boolean).join(' '))
    return parole.every((w) => testo.includes(w))
  })
}
