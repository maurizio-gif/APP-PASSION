'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ICONE } from './Navigazione'

// La barra in basso del telefono, come nelle app: le cinque cose che si usano di piu'. Si vede
// solo sugli schermi stretti (sul computer c'e' il menu a sinistra); il pulsante del menu
// resta in alto, con tutte le sezioni. Ogni voce compare solo se chi e' entrato la puo' vedere.
const SCELTE: { chiave: string; testo: string }[] = [
  { chiave: '/dashboard', testo: 'Home' },
  { chiave: '/dashboard/lead', testo: 'Lead' },
  { chiave: '/dashboard/prove', testo: 'Prove' },
  { chiave: '/dashboard/task', testo: 'Task' },
  { chiave: '/dashboard/cerca', testo: 'Cerca' },
]

export function BarraInferiore({ voci }: { voci: { href: string; testo: string; icona?: string }[] }) {
  const percorso = usePathname()
  const chiave = (v: { href: string; icona?: string }) => v.icona ?? v.href
  const presenti = SCELTE.flatMap((s) => {
    const v = voci.find((x) => chiave(x) === s.chiave)
    return v ? [{ ...s, href: v.href }] : []
  })
  if (presenti.length < 2) return null
  return (
    <nav className="barra-inferiore" aria-label="Sezioni principali">
      {presenti.map((v) => {
        const attivo = v.chiave === '/dashboard' ? percorso === v.href : percorso.startsWith(v.href)
        return (
          <Link key={v.chiave} href={v.href} className={attivo ? 'attivo' : undefined} aria-current={attivo ? 'page' : undefined}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d={ICONE[v.chiave] ?? 'M5 12h14'} />
            </svg>
            <span>{v.testo}</span>
          </Link>
        )
      })}
    </nav>
  )
}
