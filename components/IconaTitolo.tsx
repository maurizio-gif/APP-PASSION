'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { ICONE } from '@/components/Navigazione'

// Il titolo di ogni pagina porta la stessa icona della sua voce nel menu laterale.
// Scrive solo una variabile di stile (nessun altro lavoro sulla pagina).
export function IconaTitolo() {
  const percorso = usePathname() ?? ''
  useEffect(() => {
    const p = percorso.replace('/anteprima', '/dashboard')
    const chiavi = Object.keys(ICONE).filter((k) => k !== '/dashboard' && (p === k || p.startsWith(k + '/')))
    const chiave = chiavi.sort((a, b) => b.length - a.length)[0] ?? (p === '/dashboard' ? '/dashboard' : null)
    const radice = document.documentElement
    if (!chiave) return void radice.style.removeProperty('--icona-titolo')
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${ICONE[chiave]}"/></svg>`
    radice.style.setProperty('--icona-titolo', `url("data:image/svg+xml,${encodeURIComponent(svg)}")`)
  }, [percorso])
  return null
}
