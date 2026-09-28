'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { formatoCifra } from '@/lib/formato'

// Un istogramma a colonne. Su un telefono le colonne restano larghe abbastanza
// da toccarle e il grafico scorre di lato (parte gia' sugli ultimi mesi);
// l'asse dei valori resta fermo a sinistra. Toccando una colonna, o passandoci
// sopra col mouse, si apre il riquadro con i numeri di quel periodo.
//
// I valori negativi scendono sotto lo zero in rosso (il saldo); una colonna
// «tratteggiata» e' un numero che puo' ancora cambiare (il mese in corso, o
// chi e' scaduto da meno di 30 giorni e puo' ancora rinnovare).

export type Formato = 'intero' | 'segno' | 'mesi'

export type RigaDettaglio = {
  // Il quadratino accanto alla riga: il colore della colonna, quello del
  // negativo, o un colore tenue per un numero che nel grafico non c'e'.
  colore?: 'serie' | 'negativa' | 'tenue'
  valore: string
  etichetta: string
  nota?: string
}

export type Punto = {
  chiave: string
  etichetta: string
  anno?: string
  titolo: string
  valore: number | null
  tratteggio?: boolean
  righe: RigaDettaglio[]
  piede?: { etichetta: string; valore: string }[]
}

const FORMATI: Record<Formato, (v: number) => string> = {
  intero: (v) => formatoCifra(v),
  segno: (v) => (v > 0 ? `+${formatoCifra(v)}` : formatoCifra(v)),
  mesi: (v) => formatoCifra(v, 1),
}

export function Colonne({
  punti,
  altezza = 200,
  massimo,
  formato = 'intero',
  unita,
  vuoto = 'pochi dati',
}: {
  punti: Punto[]
  altezza?: number
  massimo?: number
  formato?: Formato
  unita?: string
  vuoto?: string
}) {
  const f = FORMATI[formato]
  const valori = punti.map((p) => p.valore).filter((v): v is number => v != null)
  const [basso, alto, passo] = scala(Math.min(0, ...valori), Math.max(massimo ?? 0, ...valori, 1))
  const tacche: number[] = []
  for (let t = basso; t <= alto + passo / 2; t += passo) tacche.push(Math.round(t * 100) / 100)
  const y = (v: number) => ((v - basso) / (alto - basso)) * 100
  const zero = y(0)

  // Le cifre scritte sulle colonne: l'ultima e la piu' alta, non tutte.
  const conValore = punti.map((p, i) => ({ v: p.valore, i })).filter((x) => x.v != null) as { v: number; i: number }[]
  const daScrivere = new Set<number>()
  if (conValore.length) {
    daScrivere.add(conValore[conValore.length - 1].i)
    daScrivere.add(conValore.reduce((a, b) => (Math.abs(b.v) > Math.abs(a.v) ? b : a)).i)
  }

  const guscio = useRef<HTMLDivElement>(null)
  const scorre = useRef<HTMLDivElement>(null)
  const riquadro = useRef<HTMLDivElement>(null)
  const colonne = useRef<(HTMLButtonElement | null)[]>([])
  const [scelta, setScelta] = useState<number | null>(null)
  const [posizione, setPosizione] = useState<{ left: number; top: number } | null>(null)

  // Si parte dagli ultimi mesi: quelli che interessano di piu'.
  useEffect(() => {
    const s = scorre.current
    if (s) s.scrollLeft = s.scrollWidth
  }, [])

  // Il riquadro sta sopra la colonna scelta, senza uscire dal grafico.
  const posiziona = useCallback(() => {
    if (scelta == null) return
    const g = guscio.current?.getBoundingClientRect()
    const c = colonne.current[scelta]?.getBoundingClientRect()
    const r = riquadro.current
    if (!g || !c || !r) return
    const larghezza = r.offsetWidth
    const centro = c.left + c.width / 2 - g.left
    setPosizione({ left: Math.max(0, Math.min(g.width - larghezza, centro - larghezza / 2)), top: 0 })
  }, [scelta])
  useLayoutEffect(posiziona, [posiziona])

  // Un tocco fuori dal grafico chiude il riquadro.
  useEffect(() => {
    if (scelta == null) return
    const fuori = (e: PointerEvent) => {
      if (!guscio.current?.contains(e.target as Node)) setScelta(null)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setScelta(null)
    document.addEventListener('pointerdown', fuori)
    document.addEventListener('keydown', esc)
    window.addEventListener('resize', posiziona)
    return () => {
      document.removeEventListener('pointerdown', fuori)
      document.removeEventListener('keydown', esc)
      window.removeEventListener('resize', posiziona)
    }
  }, [scelta, posiziona])

  const p = scelta == null ? null : punti[scelta]

  return (
    <div
      ref={guscio}
      className="grafico"
      style={{ ['--altezza' as string]: `${altezza}px`, ['--colonne' as string]: punti.length, ...(punti.length <= 12 ? { ['--colonna-min' as string]: '28px' } : {}) }}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setScelta(null)}
    >
      <div className="grafico-y" aria-hidden>
        {tacche.map((t) => (
          <span key={t} style={{ bottom: `${y(t)}%` }}>
            {f(t)}
          </span>
        ))}
      </div>

      <div ref={scorre} className="grafico-scorre" onScroll={posiziona}>
        <div className="grafico-corpo">
          <div className="grafico-area">
            {tacche.map((t) => (
              <span key={t} className={`grafico-griglia${t === 0 ? ' zero' : ''}`} style={{ bottom: `${y(t)}%` }} aria-hidden />
            ))}
            <div className="grafico-colonne">
              {punti.map((pt, i) => {
                const v = pt.valore
                const negativo = v != null && v < 0
                return (
                  <button
                    type="button"
                    key={pt.chiave}
                    ref={(el) => {
                      colonne.current[i] = el
                    }}
                    className={`grafico-colonna${scelta === i ? ' scelta' : ''}`}
                    aria-label={`${pt.titolo}: ${v == null ? vuoto : f(v)}${v != null && unita ? ` ${unita}` : ''}`}
                    aria-expanded={scelta === i}
                    onPointerEnter={(e) => e.pointerType === 'mouse' && setScelta(i)}
                    onClick={() => setScelta(i)}
                    onFocus={() => setScelta(i)}
                  >
                    {v != null && (
                      <span
                        className={`grafico-barra${negativo ? ' negativa' : ''}${pt.tratteggio ? ' tratteggio' : ''}`}
                        style={negativo ? { top: `${100 - zero}%`, height: `${zero - y(v)}%` } : { bottom: `${zero}%`, height: `${y(v) - zero}%` }}
                      />
                    )}
                    {v != null && daScrivere.has(i) && (
                      <span className={`grafico-cifra${negativo ? ' sotto' : ''}`} style={negativo ? { top: `${100 - y(v)}%` } : { bottom: `${y(v)}%` }}>
                        {f(v)}
                      </span>
                    )}
                    {v == null && (
                      <span className="grafico-nulla" style={{ bottom: `${zero}%` }}>
                        ·
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="grafico-x" aria-hidden>
            {punti.map((pt) => (
              <span key={pt.chiave}>
                {pt.etichetta}
                {pt.anno && <em>{pt.anno}</em>}
              </span>
            ))}
          </div>
        </div>
      </div>

      {p && (
        <div
          ref={riquadro}
          className="grafico-riquadro"
          role="status"
          style={posizione ? { left: posizione.left, top: posizione.top } : { visibility: 'hidden' }}
        >
          <div className="grafico-riquadro-titolo">{p.titolo}</div>
          <ul>
            {p.righe.map((r) => (
              <li key={r.etichetta}>
                <span className={`quadratino ${r.colore ?? 'nessuno'}`} aria-hidden />
                <div>
                  <strong>{r.valore}</strong> {r.etichetta}
                  {r.nota && <div className="grafico-riquadro-nota">{r.nota}</div>}
                </div>
              </li>
            ))}
          </ul>
          {p.piede && p.piede.length > 0 && (
            <dl className="grafico-riquadro-piede">
              {p.piede.map((r) => (
                <div key={r.etichetta}>
                  <dt>{r.etichetta}</dt>
                  <dd>{r.valore}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}
    </div>
  )
}

// Estremi e passo "tondi" per l'asse: 0 / 500 / 1.000 / 1.500...
function scala(min: number, max: number): [number, number, number] {
  const ampiezza = max - min || 1
  const grezzo = ampiezza / 4
  const potenza = 10 ** Math.floor(Math.log10(grezzo))
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * potenza).find((p) => p >= grezzo) ?? 10 * potenza
  return [Math.floor(min / passo) * passo, Math.ceil(max / passo) * passo, passo]
}
