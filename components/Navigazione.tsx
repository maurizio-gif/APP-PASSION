'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const VOCI = [
  { href: '/dashboard', testo: 'Da gestire' },
  { href: '/dashboard/lead', testo: 'Lead' },
  { href: '/dashboard/prove', testo: 'Prove' },
  { href: '/dashboard/contratti', testo: 'Nuovi contratti' },
  { href: '/dashboard/disdette', testo: 'Disdette' },
  { href: '/dashboard/abbonamenti', testo: 'Abbonamenti' },
  { href: '/dashboard/task', testo: 'Task' },
  { href: '/dashboard/cerca', testo: 'Cerca' },
]

export function Navigazione() {
  const percorso = usePathname()
  return (
    <nav>
      {VOCI.map((v) => {
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
