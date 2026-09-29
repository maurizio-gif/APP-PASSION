'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

// Sul telefono le sezioni stanno dietro il bottone ☰: si apre l'elenco, si
// sceglie, e si richiude da solo (anche con Esc). Sul computer il bottone non
// c'e' e l'elenco e' sempre li', nella barra a sinistra (.barra-menu).
export function Menu({ children }: { children: React.ReactNode }) {
  const [aperto, setAperto] = useState(false)
  const percorso = usePathname()

  useEffect(() => setAperto(false), [percorso])
  useEffect(() => {
    if (!aperto) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAperto(false)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [aperto])

  return (
    <>
      <button
        type="button"
        className="barra-hamburger"
        aria-expanded={aperto}
        aria-controls="barra-menu"
        aria-label={aperto ? 'Chiudi il menu' : 'Apri il menu'}
        onClick={() => setAperto((a) => !a)}
      >
        <span />
        <span />
        <span />
      </button>
      <div
        id="barra-menu"
        className={`barra-menu${aperto ? ' aperto' : ''}`}
        onClick={(e) => (e.target as HTMLElement).closest('a') && setAperto(false)}
      >
        {children}
      </div>
    </>
  )
}
