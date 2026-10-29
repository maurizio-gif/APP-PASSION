import { AGGIORNAMENTI } from '@/lib/aggiornamenti'

// «Aggiornamenti»: cosa e' cambiato nel CRM, in parole semplici, dal piu'
// recente. Lo vedono tutti. Le voci stanno in lib/aggiornamenti.ts.
const giorno = (d: string) => {
  const [a, m, g] = d.split('-')
  return `${g}/${m}/${a}`
}

export default function Aggiornamenti() {
  const date = Array.from(new Set(AGGIORNAMENTI.map((a) => a.data)))
  return (
    <>
      <div className="testata">
        <div>
          <div className="titolo-riga">
            <h1>Aggiornamenti</h1>
            <span className="aiuto-titolo" tabIndex={0} role="note" aria-label="Cos'è questa sezione">
              <span className="aiuto-punto" aria-hidden="true">?</span>
              <span className="aiuto-testo">Cosa è cambiato nel CRM, spiegato semplice. Le novità più recenti sono in alto.</span>
            </span>
          </div>
        </div>
      </div>
      {date.map((d) => (
        <section className="scheda" key={d}>
          <h2>{giorno(d)}</h2>
          <ul className="punti">
            {AGGIORNAMENTI.filter((a) => a.data === d).map((a) => (
              <li key={a.titolo}>
                <strong>{a.titolo}</strong>
                <div>{a.testo}</div>
                <div className="piccolo attenuato">Dove: {a.dove}</div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}
