import { LinkMinuto } from '@/components/LinkMinuto'
import type { StatoAzione } from '@/lib/crm'
import { COLORE_STATO, STATO_AZIONE } from '@/lib/riunioni'

// I pezzi dei report delle riunioni.

// Lo stato d'avanzamento: fatti in verde, in corso in giallo, il resto da fare.
export function BarraAvanzamento({ fatto, in_corso, totale, sottile = false }: {
  fatto: number
  in_corso: number
  totale: number
  sottile?: boolean
}) {
  if (!totale) return null
  const p = (n: number) => `${(n / totale) * 100}%`
  const da_fare = totale - fatto - in_corso
  return (
    <div className={`avanzamento${sottile ? ' sottile' : ''}`}>
      <div className="avanzamento-barra" role="img"
        aria-label={`${fatto} fatti, ${in_corso} in corso, ${da_fare} da fare su ${totale}`}>
        <span className="fatto" style={{ width: p(fatto) }} />
        <span className="in-corso" style={{ width: p(in_corso) }} />
      </div>
      {!sottile && (
        <div className="avanzamento-legenda piccolo">
          <span><i className="fatto" /> {fatto} fatti</span>
          <span><i className="in-corso" /> {in_corso} in corso</span>
          <span><i className="da-fare" /> {da_fare} da fare</span>
          <strong>{Math.round((fatto / totale) * 100)}%</strong>
        </div>
      )}
    </div>
  )
}

export function BollinoStato({ stato }: { stato: StatoAzione }) {
  return <span className={`bollino ${COLORE_STATO[stato]}`}>{STATO_AZIONE[stato]}</span>
}

// Il testo delle note con i minuti («[01:50:29]») che portano alla trascrizione.
export function TestoConMinuti({ testo, ancoraDi }: { testo: string; ancoraDi: (minuto: string) => string }) {
  const pezzi = testo.replace(/\(\[(\d\d:\d\d:\d\d)\]\)/g, '[$1]').split(/\[(\d\d:\d\d:\d\d)\]/)
  return (
    <>
      {pezzi.map((p, i) => (i % 2 === 1
        ? <LinkMinuto key={i} minuto={p} ancora={ancoraDi(p)} />
        : <span key={i}>{p}</span>))}
    </>
  )
}
