import Link from 'next/link'

// Il testo della guida (lib/guida): un Markdown ridotto, quanto basta per
// scriverla e correggerla senza toccare il codice. Fra un paragrafo e l'altro
// una riga vuota; «## » apre un capitolo, «### » un sottotitolo; «- » e' un
// elenco, «1. » una sequenza di passi; «> » una nota in evidenza. Dentro la
// riga: **grassetto** e [testo](/dashboard/...). Sotto una voce di elenco o un
// passo, una riga rientrata di due spazi la continua, e «  - » apre un elenco
// dentro la voce.

type Voce = { testo: string; sotto: string[] }
type Blocco =
  | { tipo: 'capitolo' | 'sottotitolo' | 'paragrafo' | 'nota'; testo: string }
  | { tipo: 'elenco' | 'passi'; voci: Voce[] }

export type Capitolo = { id: string; titolo: string }

const idDi = (titolo: string) =>
  titolo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function blocchi(testo: string): Blocco[] {
  const fuori: Blocco[] = []
  let aperto = null as Blocco | null
  const chiudi = () => {
    if (aperto) fuori.push(aperto)
    aperto = null
  }
  for (const grezza of testo.split('\n')) {
    const riga = grezza.trimEnd()
    const pulita = riga.trim()
    if (!pulita) {
      chiudi()
      continue
    }
    const voce = /^- (.*)$/.exec(pulita)
    const passo = /^\d+\. (.*)$/.exec(pulita)
    if (riga.startsWith('  ') && (aperto?.tipo === 'elenco' || aperto?.tipo === 'passi')) {
      const ultima = aperto.voci[aperto.voci.length - 1]
      if (voce) ultima.sotto.push(voce[1])
      else if (ultima.sotto.length) ultima.sotto[ultima.sotto.length - 1] += ` ${pulita}`
      else ultima.testo += ` ${pulita}`
    } else if (pulita.startsWith('## ') || pulita.startsWith('### ')) {
      chiudi()
      fuori.push({ tipo: pulita.startsWith('## ') ? 'capitolo' : 'sottotitolo', testo: pulita.replace(/^#+ /, '') })
    } else if (voce || passo) {
      const tipo = voce ? 'elenco' : 'passi'
      if (aperto?.tipo !== tipo) {
        chiudi()
        aperto = { tipo, voci: [] }
      }
      ;(aperto as { voci: Voce[] }).voci.push({ testo: (voce ?? passo)![1], sotto: [] })
    } else if (pulita.startsWith('> ')) {
      if (aperto?.tipo !== 'nota') {
        chiudi()
        aperto = { tipo: 'nota', testo: '' }
      }
      aperto.testo = `${aperto.testo} ${pulita.slice(2)}`.trim()
    } else {
      if (aperto?.tipo !== 'paragrafo') {
        chiudi()
        aperto = { tipo: 'paragrafo', testo: '' }
      }
      aperto.testo = `${aperto.testo} ${pulita}`.trim()
    }
  }
  chiudi()
  return fuori
}

// I capitoli, per l'indice in cima all'argomento e per le schede della guida.
export const capitoli = (testo: string): Capitolo[] =>
  blocchi(testo).flatMap((b) => (b.tipo === 'capitolo' ? [{ id: idDi(b.testo), titolo: b.testo }] : []))

function Riga({ testo }: { testo: string }) {
  const pezzi: React.ReactNode[] = []
  const segni = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g
  let da = 0
  for (const m of testo.matchAll(segni)) {
    if (m.index! > da) pezzi.push(testo.slice(da, m.index))
    if (m[1] != null) pezzi.push(<strong key={m.index}>{m[1]}</strong>)
    else if (m[3].startsWith('/')) pezzi.push(<Link key={m.index} href={m[3]}>{m[2]}</Link>)
    else pezzi.push(<a key={m.index} href={m[3]} target="_blank" rel="noreferrer">{m[2]}</a>)
    da = m.index! + m[0].length
  }
  if (da < testo.length) pezzi.push(testo.slice(da))
  return <>{pezzi}</>
}

function Voci({ voci }: { voci: Voce[] }) {
  return (
    <>
      {voci.map((v, j) => (
        <li key={j}>
          <Riga testo={v.testo} />
          {v.sotto.length > 0 && <ul className="punti">{v.sotto.map((x, k) => <li key={k}><Riga testo={x} /></li>)}</ul>}
        </li>
      ))}
    </>
  )
}

export function TestoGuida({ testo }: { testo: string }) {
  return (
    <div className="guida-testo">
      {blocchi(testo).map((b, i) => {
        switch (b.tipo) {
          case 'capitolo':
            return <h2 key={i} id={idDi(b.testo)}>{b.testo}</h2>
          case 'sottotitolo':
            return <h3 key={i}>{b.testo}</h3>
          case 'nota':
            return <p key={i} className="guida-nota"><Riga testo={b.testo} /></p>
          case 'elenco':
            return <ul key={i} className="punti"><Voci voci={b.voci} /></ul>
          case 'passi':
            return <ol key={i} className="guida-passi"><Voci voci={b.voci} /></ol>
          default:
            return <p key={i}><Riga testo={b.testo} /></p>
        }
      })}
    </div>
  )
}
