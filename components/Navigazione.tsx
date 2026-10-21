'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

// Le icone sono SVG disegnati qui (nessun file e nessuna libreria da caricare).
export const ICONE: Record<string, string> = {
  '/dashboard': 'M3 12l9-8 9 8M5 10v10h14V10',
  '/dashboard/lead': 'M16 11a4 4 0 10-8 0 4 4 0 008 0zM4 20c0-3.3 3.6-6 8-6s8 2.7 8 6',
  '/dashboard/prove': 'M12 8v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  '/dashboard/contratti': 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6',
  '/dashboard/disdette': 'M15 4h5v16h-5M10 8l-4 4 4 4M6 12h10',
  '/dashboard/rinnovi': 'M20 12a8 8 0 10-2.3 5.7M20 5v5h-5',
  '/dashboard/task': 'M5 12l4 4 10-10',
  '/dashboard/cerca': 'M11 18a7 7 0 100-14 7 7 0 000 14zM21 21l-4.5-4.5',
  '/dashboard/debitori': 'M12 3v18M16 7.5c0-1.4-1.8-2.5-4-2.5s-4 1.1-4 2.5S9.8 10 12 10s4 1.1 4 2.5-1.8 2.5-4 2.5-4-1.1-4-2.5',
  '/dashboard/marketing': 'M3 11v2a1 1 0 001 1h2l5 4V6L6 10H4a1 1 0 00-1 1zM15 9a4 4 0 010 6M18 6.5a8 8 0 010 11',
  '/dashboard/abbonamenti': 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  '/dashboard/ticket': 'M3 9a2 2 0 002-2h14a2 2 0 002 2v2a2 2 0 000 4v2a2 2 0 00-2 2H5a2 2 0 00-2-2v-2a2 2 0 000-4z',
  '/dashboard/curriculum': 'M6 3h12v18H6zM9 8h6M9 12h6M9 16h4',
  '/dashboard/utenti': 'M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2 20c0-3 3-5 7-5s7 2 7 5M17 4.5a3.5 3.5 0 010 6.5M19 15c2 .6 3 2.2 3 4',
  '/dashboard/riunioni': 'M4 5h16v11H9l-5 4zM8 9h8M8 12h5',
  '/dashboard/guida': 'M4 5.5C6 4 9 4 12 6c3-2 6-2 8-.5V19c-2-1.5-5-1.5-8 .5-3-2-6-2-8-.5zM12 6v13.5',
  '/dashboard/aggiornamenti': 'M12 3l2.4 5.6L20 11l-5.6 2.4L12 19l-2.4-5.6L4 11l5.6-2.4z',
}

// Le icone delle categorie.
const ICONE_GRUPPO: Record<string, string> = {
  Clienti: 'M16 11a4 4 0 10-8 0 4 4 0 008 0zM4 20c0-3.3 3.6-6 8-6s8 2.7 8 6',
  Analisi: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  Team: 'M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2 20c0-3 3-5 7-5s7 2 7 5M17 4.5a3.5 3.5 0 010 6.5M19 15c2 .6 3 2.2 3 4',
  Assistenza: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 15a3 3 0 100-6 3 3 0 000 6zM5.6 5.6l3.5 3.5M14.9 14.9l3.5 3.5M18.4 5.6l-3.5 3.5M9.1 14.9l-3.5 3.5',
  Altro: 'M5 12h14',
}

// Le voci raggruppate per categoria (solo presentazione: ogni voce resta com'e', cambia
// l'ordine in cui compaiono). Le voci che non stanno in nessun gruppo vanno in fondo.
const GRUPPI: { titolo?: string; voci: string[] }[] = [
  { voci: ['/dashboard'] },
  { titolo: 'Clienti', voci: ['/dashboard/lead', '/dashboard/prove', '/dashboard/contratti', '/dashboard/rinnovi', '/dashboard/disdette', '/dashboard/debitori', '/dashboard/task', '/dashboard/cerca'] },
  { titolo: 'Analisi', voci: ['/dashboard/abbonamenti', '/dashboard/marketing', '/dashboard/riunioni'] },
  { titolo: 'Team', voci: ['/dashboard/curriculum', '/dashboard/utenti'] },
  { titolo: 'Assistenza', voci: ['/dashboard/ticket', '/dashboard/guida', '/dashboard/aggiornamenti'] },
]

// Il menu: le voci le sceglie il layout, secondo le sezioni di chi e' entrato.
// Le categorie sono sovrasezioni: se ne apre una alla volta (aprendone una, l'altra si
// chiude). All'inizio e' aperta quella della pagina in cui sei, e quando cambi pagina
// si apre quella della nuova pagina.
export function Navigazione({ voci }: { voci: { href: string; testo: string; icona?: string }[] }) {
  const percorso = usePathname()
  const chiave = (v: { href: string; icona?: string }) => v.icona ?? v.href
  const usate = new Set(GRUPPI.flatMap((g) => g.voci))
  const gruppi = [
    ...GRUPPI.map((g) => ({ titolo: g.titolo, voci: g.voci.flatMap((k) => voci.filter((v) => chiave(v) === k)) })),
    { titolo: 'Altro', voci: voci.filter((v) => !usate.has(chiave(v))) },
  ].filter((g) => g.voci.length > 0)
  const eAttivo = (v: { href: string; icona?: string }) => (chiave(v) === '/dashboard' ? percorso === v.href : percorso.startsWith(v.href))
  const dellaPagina = gruppi.find((g) => g.titolo && g.voci.some(eAttivo))?.titolo ?? null

  // La categoria aperta: undefined = quella della pagina; null = nessuna (chiusa da te).
  const [scelta, setScelta] = useState<string | null | undefined>(undefined)
  useEffect(() => setScelta(undefined), [percorso])
  const aperta = scelta === undefined ? dellaPagina : scelta

  return (
    <nav>
      {/* sfumatura rosso-nero delle icone del menu (solo disegno) */}
      <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="grad-icona" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#e3032d" />
            <stop offset="0.62" stopColor="#ff3a58" />
            <stop offset="1" stopColor="#ffffff" />
          </linearGradient>
        </defs>
      </svg>
      {gruppi.map((g) => {
        const titolo = g.titolo
        const eAperta = !titolo || titolo === aperta
        return (
          <div className={`gruppo-menu${eAperta ? ' aperto' : ''}`} key={titolo ?? 'principale'}>
            {titolo && (
              <button type="button" className="gruppo-menu-titolo" aria-expanded={eAperta} onClick={() => setScelta(eAperta ? null : titolo)}>
                <span className="gruppo-menu-icona" aria-hidden="true">
                  <svg viewBox="0 0 24 24"><path d={ICONE_GRUPPO[titolo] ?? ICONE_GRUPPO.Altro} /></svg>
                </span>
                <span className="gruppo-menu-nome">{titolo}</span>
                {!eAperta && titolo === dellaPagina && <span className="gruppo-menu-punto" aria-hidden="true" />}
                <svg className="gruppo-menu-freccia" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
              </button>
            )}
            {eAperta && g.voci.map((v) => (
              <Link key={v.href} href={v.href} className={eAttivo(v) ? 'attivo' : undefined}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d={ICONE[chiave(v)] ?? 'M5 12h14'} />
                </svg>
                {v.testo}
              </Link>
            ))}
          </div>
        )
      })}
    </nav>
  )
}
