'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// «Come funziona»: il bottone accanto alla descrizione di una sezione apre il
// suo capitolo della guida in una finestra, senza lasciare la pagina. La
// finestra e' un <dialog> (si chiude con Esc, con la ✕ o toccando fuori) messo
// in fondo al documento: dentro il paragrafo della descrizione l'HTML non lo
// permette. Il testo arriva gia' pronto dal server, come `children`.
export function ApriGuida({ titolo, inBreve, href, children }: {
  titolo: string
  inBreve: string
  href: string
  children: React.ReactNode
}) {
  const finestra = useRef<HTMLDialogElement>(null)
  const [pronto, setPronto] = useState(false)
  useEffect(() => setPronto(true), [])
  const chiudi = () => finestra.current?.close()

  return (
    <>
      <button type="button" className="link-guida" onClick={() => finestra.current?.showModal()}>
        Come funziona
      </button>
      {pronto &&
        createPortal(
          <dialog
            ref={finestra}
            className="guida-modale"
            aria-label={`Guida: ${titolo}`}
            onClick={(e) => {
              if (e.target === e.currentTarget) chiudi()
            }}
          >
            <div className="guida-modale-scheda">
              <div className="guida-modale-testa">
                <div>
                  <div className="piccolo attenuato">Guida</div>
                  <h2>{titolo}</h2>
                </div>
                <button type="button" className="guida-modale-chiudi" onClick={chiudi} aria-label="Chiudi">
                  ✕
                </button>
              </div>
              <p className="attenuato">{inBreve}</p>
              {children}
              <div className="guida-modale-piede">
                <Link href={href} onClick={chiudi}>Apri nella guida →</Link>
              </div>
            </div>
          </dialog>,
          document.body,
        )}
    </>
  )
}
