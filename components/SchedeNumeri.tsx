'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'

// Le schede di «Da gestire» come riquadri col numero. Al clic la scheda si accende subito
// (senza aspettare la pagina nuova) e il contenuto sotto si attenua finche' non arriva
// quello nuovo: il cambio resta fluido invece di far sparire tutto per un attimo.
// La scheda aperta mostra dentro di se' il link «Vai a ...» alla sezione completa.
export type VoceNumero = {
  chiave: string
  testo: string
  n?: number
  nota?: string
  caldo?: boolean
  vai?: string
  vaiTesto?: string
}

export function SchedeNumeri({ voci, attiva, base }: { voci: VoceNumero[]; attiva: string; base: string }) {
  const router = useRouter()
  const [scelta, setScelta] = useState(attiva)
  const [inCorso, avvia] = useTransition()
  const contenitore = useRef<HTMLDivElement>(null)

  // quando la pagina nuova e' arrivata, vale quella del server
  useEffect(() => setScelta(attiva), [attiva])
  // la sezione intorno si attenua mentre il contenuto nuovo arriva
  useEffect(() => {
    contenitore.current?.closest('section')?.toggleAttribute('data-carica', inCorso)
  }, [inCorso])

  const href = (chiave: string) => `${base}${base.includes('?') ? '&' : '?'}vista=${chiave}`
  const apri = (chiave: string) => {
    if (chiave === scelta) return
    setScelta(chiave)
    avvia(() => router.push(href(chiave), { scroll: false }))
  }

  return (
    <div className="numeri numeri-schede" ref={contenitore} role="tablist">
      {voci.map((v) => {
        const aperta = v.chiave === scelta
        return (
          <div
            key={v.chiave}
            role="tab"
            tabIndex={0}
            aria-selected={aperta}
            className={`numero${v.caldo ? ' caldo' : ''}${aperta ? ' attivo' : ''}`}
            onClick={() => apri(v.chiave)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                apri(v.chiave)
              }
            }}
          >
            <div className="etichetta">{v.testo}</div>
            {v.n != null && <div className="valore">{v.n}</div>}
            {v.nota && <div className="nota">{v.nota}</div>}
            {/* Sempre presente (nascosto nelle altre schede) cosi' l'altezza non cambia. */}
            {v.vai && (
              <Link
                href={v.vai}
                className="numero-vai"
                onClick={(e) => e.stopPropagation()}
                tabIndex={aperta ? 0 : -1}
                aria-hidden={!aperta}
              >
                {v.vaiTesto ?? 'Vai'} →
              </Link>
            )}
          </div>
        )
      })}
    </div>
  )
}
