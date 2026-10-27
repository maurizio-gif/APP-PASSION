'use client'

import { useEffect, useRef, useState } from 'react'

// Un'icona «i» che spiega un numero: si apre passandoci sopra col mouse, con la
// tastiera (Tab) o toccandola sul telefono, e si chiude uscendo, con Esc o
// scorrendo. Il fumetto e' «fixed»: non lo taglia la tabella che scorre di lato e
// resta dentro lo schermo (sopra l'icona se sotto non c'e' posto).
export function Info({ testo, titolo }: { testo: string; titolo?: string }) {
  const [pos, setPos] = useState<{ left: number; larghezza: number; top?: number; bottom?: number } | null>(null)
  const bottone = useRef<HTMLButtonElement>(null)

  const apri = () => {
    const r = bottone.current?.getBoundingClientRect()
    if (!r) return
    const larghezza = Math.min(320, window.innerWidth - 24)
    const left = Math.max(12, Math.min(r.left + r.width / 2 - larghezza / 2, window.innerWidth - larghezza - 12))
    const sotto = window.innerHeight - r.bottom > 220
    setPos(sotto ? { left, larghezza, top: r.bottom + 8 } : { left, larghezza, bottom: window.innerHeight - r.top + 8 })
  }
  const chiudi = () => setPos(null)

  useEffect(() => {
    if (!pos) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setPos(null)
    // Un tocco fuori dall'icona lo chiude (sul telefono non c'e' il mouse che esce).
    const fuori = (e: PointerEvent) => !bottone.current?.contains(e.target as Node) && setPos(null)
    window.addEventListener('keydown', esc)
    window.addEventListener('pointerdown', fuori)
    window.addEventListener('scroll', chiudi, true)
    return () => {
      window.removeEventListener('keydown', esc)
      window.removeEventListener('pointerdown', fuori)
      window.removeEventListener('scroll', chiudi, true)
    }
  }, [pos])

  return (
    <>
      <button
        type="button"
        ref={bottone}
        className="info"
        aria-label={`Come si calcola${titolo ? `: ${titolo}` : ''}`}
        aria-expanded={pos != null}
        onMouseEnter={apri}
        onMouseLeave={chiudi}
        onFocus={apri}
        onBlur={chiudi}
        onClick={(e) => {
          // Sul telefono il tocco fa anche «mouse sopra»: il clic non deve richiudere subito.
          e.preventDefault()
          apri()
        }}
      >
        i
      </button>
      {pos && (
        <span role="tooltip" className="info-testo" style={{ left: pos.left, width: pos.larghezza, top: pos.top, bottom: pos.bottom }}>
          {testo}
        </span>
      )}
    </>
  )
}
