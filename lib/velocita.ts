// La velocita' del primo ricontatto di un'opportunita' (supabase/migrations/20261027d).
//
// Il primo ricontatto e' il primo task chiuso dopo l'arrivo, anche un tentativo
// («Non risponde»). Il tempo e' di ORARIO DI LAVORO: dalle 9 alle 21 dal lunedi al
// venerdi, dalle 10 alle 19:30 il sabato e la domenica (20261027f). Un'opportunita'
// arrivata a mezzanotte comincia a contare alle 9 (alle 10 nel weekend). Il calcolo sta nel database
// (`crm.minuti_lavoro`); qui si decide solo come si scrive e di che colore e'.

export const ORARIO_LAVORO = 'orario di lavoro: 9–21 dal lunedì al venerdì, 10–19:30 sabato e domenica'

// Fino a questa soglia, in minuti di lavoro, il ricontatto e' tempestivo; fino
// alla seconda e' accettabile; oltre e' in ritardo.
export const SOGLIA_VERDE = 30
export const SOGLIA_GIALLO = 120

export function tempoLavoro(minuti: number | null | undefined) {
  if (minuti == null) return '—'
  const m = Math.round(minuti)
  if (m < 60) return `${m} min`
  const ore = Math.floor(m / 60)
  const resto = m % 60
  return resto ? `${ore} h ${resto} min` : `${ore} h`
}

export const coloreVelocita = (minuti: number) => (minuti <= SOGLIA_VERDE ? 'verde' : minuti <= SOGLIA_GIALLO ? 'giallo' : 'rosso')
