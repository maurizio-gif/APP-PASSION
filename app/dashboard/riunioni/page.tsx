import Link from 'next/link'
import { redirect } from 'next/navigation'
import { crm } from '@/lib/crm'
import { formatoGiornoLungo } from '@/lib/formato'
import { puoRiunioni } from '@/lib/permessi'
import { Vuoto } from '@/components/Ui'
import { BarraAvanzamento } from '@/components/Riunione'

// I report delle riunioni del progetto, dal piu' recente: solo superadmin e
// admin. In cima lo stato d'avanzamento di tutti i passaggi decisi.
export default async function Riunioni() {
  const io = await crm.io()
  if (!puoRiunioni(io)) redirect(`/dashboard?errore=${encodeURIComponent('I report delle riunioni li vedono solo superadmin e admin.')}`)
  const riunioni = await crm.riunioni()
  const totale = riunioni.reduce(
    (t, r) => ({ totale: t.totale + r.azioni, fatto: t.fatto + r.fatte, in_corso: t.in_corso + r.in_corso }),
    { totale: 0, fatto: 0, in_corso: 0 },
  )
  const decisioni = riunioni.reduce((t, r) => t + r.decisioni, 0)

  return (
    <>
      <div className="testata">
        <div>
          <h1>Report riunioni</h1>
          <p>Qui troviamo tutti i report delle riunioni: un&apos;unica raccolta dello stato d&apos;avanzamento del progetto.
            Questo strumento ci aiuta a mantenere la coerenza nello sviluppo delle informazioni e di tutto quello che ci diciamo.</p>
        </div>
      </div>

      {riunioni.length > 0 && (
        <section className="scheda riunione-quadro">
          <div className="riunione-quadro-numeri">
            <div><span className="valore">{riunioni.length}</span><span className="etichetta">{riunioni.length === 1 ? 'riunione' : 'riunioni'}</span></div>
            <div><span className="valore">{decisioni}</span><span className="etichetta">decisioni</span></div>
            <div><span className="valore">{totale.fatto}<small>/{totale.totale}</small></span><span className="etichetta">passaggi fatti</span></div>
          </div>
          <BarraAvanzamento fatto={totale.fatto} in_corso={totale.in_corso} totale={totale.totale} />
        </section>
      )}

      {riunioni.length === 0 ? (
        <div className="scheda"><Vuoto>Nessun report ancora.</Vuoto></div>
      ) : (
        <ol className="riunioni-elenco">
          {riunioni.map((r) => {
            const [a, m, g] = r.data.split('-')
            return (
              <li key={r.id}>
                <Link href={`/dashboard/riunioni/${r.id}`} className="scheda riunione-voce">
                  <div className="riunione-data" aria-hidden>
                    <span className="giorno">{g}</span>
                    <span className="mese">{new Date(Number(a), Number(m) - 1, 1).toLocaleDateString('it-IT', { month: 'short' })}</span>
                    <span className="anno">{a}</span>
                  </div>
                  <div className="riunione-voce-corpo">
                    <div className="piccolo attenuato">
                      {formatoGiornoLungo(r.data)}{r.ora ? ` · ${r.ora.slice(0, 5)}` : ''}{r.durata ? ` · ${r.durata}` : ''}
                    </div>
                    <h2>{r.titolo}</h2>
                    {r.sintesi && <p>{r.sintesi}</p>}
                    <div className="riunione-voce-piede">
                      <span className="piccolo">{r.partecipanti.join(' · ')}</span>
                      <span className="piccolo"><strong>{r.decisioni}</strong> decisioni · <strong>{r.fatte}</strong> di {r.azioni} passaggi fatti</span>
                    </div>
                    <BarraAvanzamento fatto={r.fatte} in_corso={r.in_corso} totale={r.azioni} sottile />
                  </div>
                </Link>
              </li>
            )
          })}
        </ol>
      )}
    </>
  )
}
