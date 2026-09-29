'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

// Il menu: le voci le sceglie il layout, secondo le sezioni di chi e' entrato.
// Sul telefono e' una riga sola che scorre di lato: la voce della pagina aperta
// si porta al centro, cosi' si vede sempre dove si e'.
export function Navigazione({ voci }: { voci: { href: string; testo: string }[] }) {
  const percorso = usePathname()
  const menu = useRef<HTMLElement>(null)

  useEffect(() => {
    const nav = menu.current
    const attiva = nav?.querySelector<HTMLElement>('a.attivo')
    if (!nav || !attiva || nav.scrollWidth <= nav.clientWidth) return
    nav.scrollLeft = attiva.offsetLeft - (nav.clientWidth - attiva.offsetWidth) / 2
  }, [percorso])

  return (
    <nav ref={menu}>
      {voci.map((v) => {
        const attivo = v.href === '/dashboard' ? percorso === v.href : percorso.startsWith(v.href)
        return (
          <Link key={v.href} href={v.href} className={attivo ? 'attivo' : undefined}>
            {v.testo}
          </Link>
        )
      })}
    </nav>
  )
}
