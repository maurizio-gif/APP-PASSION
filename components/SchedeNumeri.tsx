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
  // un secondo collegamento, per le schede che riguardano due sezioni
  vaiAltro?: { href: string; testo: string }
  // se il numero non c'e', un pulsante «Calcola» lo chiede (lettura a richiesta)
  calcola?: () => Promise<number>
}

export function SchedeNumeri({ voci, attiva, base }: { voci: VoceNumero[]; attiva: string; base: string }) {
  const router = useRouter()
  const [scelta, setScelta] = useState(attiva)
  const [inCorso, avvia] = useTransition()
  const [calcolati, setCalcolati] = useState<Record<string, number | 'attendi' | 'errore'>>({})
  const contenitore = useRef<HTMLDivElement>(null)

  // quando la pagina nuova e' arrivata, vale quella del server
  useEffect(() => setScelta(attiva), [attiva])
  // la sezione intorno si attenua mentre il contenuto nuovo arriva
  useEffect(() => {
    contenitore.current?.closest('section')?.toggleAttribute('data-carica', inCorso)
  }, [inCorso])

  const calcola = async (v: VoceNumero) => {
    if (!v.calcola) return
    setCalcolati((c) => ({ ...c, [v.chiave]: 'attendi' }))
    try {
      const n = await v.calcola()
      setCalcolati((c) => ({ ...c, [v.chiave]: n }))
    } catch {
      setCalcolati((c) => ({ ...c, [v.chiave]: 'errore' }))
    }
  }
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
            {v.n == null && v.calcola && typeof calcolati[v.chiave] === 'number' && <div className="valore">{calcolati[v.chiave] as number}</div>}
            {v.n == null && v.calcola && typeof calcolati[v.chiave] !== 'number' && (
              <button
                type="button"
                className="calcola-numero"
                disabled={calcolati[v.chiave] === 'attendi'}
                onClick={(e) => {
                  e.stopPropagation()
                  calcola(v)
                }}
                onKeyDown={(e) => e.stopPropagation()}
              >
                {calcolati[v.chiave] === 'attendi' ? 'Calcolo…' : calcolati[v.chiave] === 'errore' ? 'Riprova' : 'Calcola'}
              </button>
            )}
            {v.nota && (
              <div className="nota">
                {v.nota.split(/(\d+)/).map((pezzo, i) => (i % 2 ? <b key={i}>{pezzo}</b> : pezzo))}
              </div>
            )}
            {/* Sempre presente (nascosto nelle altre schede) cosi' l'altezza non cambia. */}
            {v.vai && (
              <div className="numero-vai-riga" aria-hidden={!aperta}>
                <Link href={v.vai} className="numero-vai" onClick={(e) => e.stopPropagation()} tabIndex={aperta ? 0 : -1}>
                  {v.vaiAltro ? (v.vaiTesto ?? 'Vai').replace(/^Vai a /, '') : (v.vaiTesto ?? 'Vai')} →
                </Link>
                {v.vaiAltro && (
                  <Link href={v.vaiAltro.href} className="numero-vai" onClick={(e) => e.stopPropagation()} tabIndex={aperta ? 0 : -1}>
                    {v.vaiAltro.testo.replace(/^Vai a /, '')} →
                  </Link>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
