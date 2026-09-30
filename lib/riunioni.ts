import type { AzioneRiunione, StatoAzione } from '@/lib/crm'

// I report delle riunioni: la trascrizione a blocchi, i minuti, gli stati.

export const STATO_AZIONE: Record<StatoAzione, string> = { da_fare: 'Da fare', in_corso: 'In corso', fatto: 'Fatto' }
export const COLORE_STATO: Record<StatoAzione, string> = { da_fare: 'grigio', in_corso: 'giallo', fatto: 'verde' }

export type RigaTrascrizione = { chi: string | null; testo: string }
export type BloccoTrascrizione = { minuto: string; righe: RigaTrascrizione[] }

// La trascrizione sta nel database a righe: «[hh:mm:ss]» apre un blocco,
// «Nome: testo» e' un intervento, l'ultima riga dice quando e' finita.
export function blocchiTrascrizione(testo: string) {
  const blocchi: BloccoTrascrizione[] = []
  let fine: string | null = null
  for (const riga of testo.split('\n')) {
    const r = riga.trim()
    if (!r) continue
    const minuto = r.match(/^\[(\d\d:\d\d:\d\d)\]$/)
    if (minuto) {
      blocchi.push({ minuto: minuto[1], righe: [] })
      continue
    }
    if (r.startsWith('Trascrizione terminata')) {
      fine = r
      continue
    }
    const i = r.indexOf(': ')
    const voce = i > 0 && i < 60 ? { chi: r.slice(0, i), testo: r.slice(i + 2) } : { chi: null, testo: r }
    if (!blocchi.length) blocchi.push({ minuto: '00:00:00', righe: [] })
    blocchi[blocchi.length - 1].righe.push(voce)
  }
  return { blocchi, fine }
}

const secondi = (m: string) => m.split(':').reduce((t, n) => t * 60 + Number(n), 0)
export const ancora = (minuto: string) => `t-${minuto.replace(/:/g, '')}`

// Il blocco della trascrizione in cui cade un minuto: l'ultimo che inizia
// prima (le note citano un minuto dentro il blocco, non sempre il suo inizio).
export function ancoraDelMinuto(minuto: string, blocchi: BloccoTrascrizione[]) {
  const t = secondi(minuto)
  let scelto = blocchi[0]?.minuto ?? minuto
  for (const b of blocchi) {
    if (secondi(b.minuto) <= t) scelto = b.minuto
    else break
  }
  return ancora(scelto)
}

// I passaggi per stato: quanti fatti, in corso, da fare.
export function conta(azioni: Pick<AzioneRiunione, 'stato'>[]) {
  const c = { fatto: 0, in_corso: 0, da_fare: 0 }
  for (const a of azioni) c[a.stato] += 1
  return { ...c, totale: azioni.length }
}

// Chi ha piu' passaggi prima; per ognuno quanti ne ha fatti.
export function perPersona(azioni: AzioneRiunione[]) {
  const m = new Map<string, { chi: string; totale: number; fatte: number }>()
  for (const a of azioni) {
    for (const chi of a.chi) {
      const v = m.get(chi) ?? { chi, totale: 0, fatte: 0 }
      v.totale += 1
      if (a.stato === 'fatto') v.fatte += 1
      m.set(chi, v)
    }
  }
  return [...m.values()].sort((a, b) => b.totale - a.totale || a.chi.localeCompare(b.chi))
}
