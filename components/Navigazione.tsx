'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Il menu: le voci le sceglie il layout, secondo le sezioni di chi e' entrato.
export function Navigazione({ voci }: { voci: { href: string; testo: string }[] }) {
  const percorso = usePathname()
  return (
    <nav>
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
