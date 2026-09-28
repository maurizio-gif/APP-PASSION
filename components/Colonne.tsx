import { formatoNumero } from '@/lib/formato'

// Un istogramma a colonne, in HTML e CSS: si legge bene anche dal telefono e
// non ha bisogno di JavaScript. Passando il mouse (o col tab) su una colonna
// si apre il riquadro con i numeri del mese.
//
// I valori negativi scendono sotto lo zero in rosso (il saldo); una colonna
// «tratteggiata» e' un numero che puo' ancora cambiare (il mese in corso, o
// chi e' scaduto da meno di 30 giorni e puo' ancora rinnovare).

export type Punto = {
  chiave: string
  etichetta: string
  anno?: string
  titolo: string
  valore: number | null
  tratteggio?: boolean
  righe?: string[]
}

export function Colonne({
  punti,
  altezza = 200,
  massimo,
  formato = formatoNumero,
  unita,
  vuoto = 'pochi dati',
}: {
  punti: Punto[]
  altezza?: number
  massimo?: number
  formato?: (v: number) => string
  unita?: string
  vuoto?: string
}) {
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

  return (
    <div className={`grafico${punti.length > 12 ? ' denso' : ''}`} style={{ ['--altezza' as string]: `${altezza}px` }}>
      <div className="grafico-y" aria-hidden>
        {tacche.map((t) => (
          <span key={t} style={{ bottom: `${y(t)}%` }}>
            {formato(t)}
          </span>
        ))}
      </div>
      <div className="grafico-corpo">
        <div className="grafico-area">
          {tacche.map((t) => (
            <span key={t} className={`grafico-griglia${t === 0 ? ' zero' : ''}`} style={{ bottom: `${y(t)}%` }} aria-hidden />
          ))}
          <div className="grafico-colonne">
            {punti.map((p, i) => {
              const v = p.valore
              const lato = i < punti.length / 4 ? ' sinistra' : i >= (punti.length * 3) / 4 ? ' destra' : ''
              const negativo = v != null && v < 0
              return (
                <div key={p.chiave} className={`grafico-colonna${lato}`} tabIndex={0} aria-label={`${p.titolo}: ${v == null ? vuoto : formato(v)}${unita ? ` ${unita}` : ''}`}>
                  {v != null && (
                    <span
                      className={`grafico-barra${negativo ? ' negativa' : ''}${p.tratteggio ? ' tratteggio' : ''}`}
                      style={negativo ? { top: `${100 - zero}%`, height: `${zero - y(v)}%` } : { bottom: `${zero}%`, height: `${y(v) - zero}%` }}
                    />
                  )}
                  {v != null && daScrivere.has(i) && (
                    <span className={`grafico-cifra${negativo ? ' sotto' : ''}`} style={negativo ? { top: `${100 - y(v)}%` } : { bottom: `${y(v)}%` }}>
                      {formato(v)}
                    </span>
                  )}
                  {v == null && <span className="grafico-nulla" style={{ bottom: `${zero}%` }}>·</span>}
                  <div className="grafico-suggerimento" role="tooltip">
                    <strong>{p.titolo}</strong>
                    <div className="grafico-suggerimento-valore">
                      {v == null ? vuoto : formato(v)}
                      {v != null && unita ? ` ${unita}` : ''}
                    </div>
                    {p.righe?.map((r) => <div key={r}>{r}</div>)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="grafico-x" aria-hidden>
          {punti.map((p, i) => (
            <span key={p.chiave} className={i % 3 === (punti.length - 1) % 3 ? 'sempre' : undefined}>
              {p.etichetta}
              {p.anno && <em>{p.anno}</em>}
            </span>
          ))}
        </div>
      </div>
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
