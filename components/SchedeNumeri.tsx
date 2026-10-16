'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'

// Le schede di «Da gestire» come riquadri col numero. Al clic la scheda si accende subito
// (senza aspettare la pagina nuova) e il contenuto sotto si attenua finche' non arriva
// quello nuovo: il cambio resta fluido invece di far sparire tutto per un attimo.
export type VoceNumero = { chiave: string; testo: string; n?: number; nota?: string; caldo?: boolean }

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

  return (
    <div className="numeri numeri-schede" ref={contenitore} role="tablist">
      {voci.map((v) => (
        <Link
          key={v.chiave}
          href={href(v.chiave)}
          scroll={false}
          role="tab"
          aria-selected={v.chiave === scelta}
          className={`numero${v.caldo ? ' caldo' : ''}${v.chiave === scelta ? ' attivo' : ''}`}
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
            e.preventDefault()
            if (v.chiave === scelta) return
            setScelta(v.chiave)
            avvia(() => router.push(href(v.chiave), { scroll: false }))
          }}
        >
          <div className="etichetta">{v.testo}</div>
          {v.n != null && <div className="valore">{v.n}</div>}
          {v.nota && <div className="nota">{v.nota}</div>}
        </Link>
      ))}
    </div>
  )
}
