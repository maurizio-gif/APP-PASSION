import Link from 'next/link'
import { crm, richiediSezione } from '@/lib/crm'
import { eGiornoValido, formatoCifra, formatoGiornoLungo, formatoOra, oggiRoma, spostaGiorno } from '@/lib/formato'
import { Vuoto } from '@/components/Ui'

type Filtri = { giorno?: string; istruttore?: string; lezione?: string; categoria?: string; sala?: string }
const numero = (v: string | undefined) => (v && /^\d+$/.test(v) ? Number(v) : null)

// L'Appello complessivo: tutte le lezioni di un giorno, di tutti gli
// istruttori, con chi ha prenotato e chi e' presente. Si filtra per istruttore,
// lezione, categoria e sala. Solo da leggere: la presenza la segna l'istruttore
// dal suo appello. Lo vedono gli admin e i consulenti. Le regole stanno nel
// database (supabase/migrations/20261027i_appello.sql).
export default async function AppelloTutte({ searchParams }: { searchParams: Filtri }) {
  await richiediSezione('appello_tutte')
  const oggi = oggiRoma()
  const giorno = eGiornoValido(searchParams.giorno) ? searchParams.giorno : oggi
  const istruttore = numero(searchParams.istruttore)
  const lezione = numero(searchParams.lezione)
  const categoria = numero(searchParams.categoria)
  const sala = numero(searchParams.sala)
  const r = await crm.appelloTutte(giorno, { istruttore, lezione, categoria, sala })

  const filtri = new URLSearchParams()
  for (const [k, v] of Object.entries({ istruttore, lezione, categoria, sala })) if (v != null) filtri.set(k, String(v))
  const con = (g: string) => `/dashboard/appello-tutte?giorno=${g}${filtri.toString() ? `&${filtri.toString()}` : ''}`
  const conFiltri = filtri.size > 0

  const adesso = Date.now()
  const prenotati = r.lezioni.reduce((a, l) => a + l.prenotati.length, 0)
  const presenti = r.lezioni.reduce((a, l) => a + l.prenotati.filter((p) => p.presente).length, 0)
  // La percentuale ha senso sulle lezioni finite o in corso: le future non hanno ancora presenze.
  const iniziate = r.lezioni.filter((l) => Date.parse(l.inizio) <= adesso)
  const prenotatiIniziate = iniziate.reduce((a, l) => a + l.prenotati.length, 0)
  const presentiIniziate = iniziate.reduce((a, l) => a + l.prenotati.filter((p) => p.presente).length, 0)
  const senzaPrenotati = r.lezioni.filter((l) => l.prenotati.length === 0).length

  const Scelta = ({ nome, valore, scelte, tutti }: { nome: string; valore: number | null; scelte: { id: number; nome: string }[]; tutti: string }) => (
    <select name={nome} defaultValue={valore ?? ''} aria-label={tutti}>
      <option value="">{tutti}</option>
      {scelte.map((s) => (
        <option key={s.id} value={s.id}>
          {s.nome}
        </option>
      ))}
    </select>
  )

  return (
    <>
      <div className="testata">
        <div>
          <h1>Appello complessivo</h1>
          <p>
            {giorno === oggi ? 'Oggi, ' : ''}
            {formatoGiornoLungo(giorno)}. Tutte le lezioni del giorno, con chi ha prenotato e chi è presente. La presenza la segna l&apos;istruttore dal suo appello,
            da 59 minuti prima a 59 minuti dopo la lezione: qui si legge soltanto.
          </p>
        </div>
      </div>

      <form className="filtri" action="/dashboard/appello-tutte">
        <Link className="bottone secondario" href={con(spostaGiorno(giorno, -1))} aria-label="Giorno prima">
          ←
        </Link>
        <input type="date" name="giorno" defaultValue={giorno} aria-label="Giorno" />
        <Link className="bottone secondario" href={con(spostaGiorno(giorno, 1))} aria-label="Giorno dopo">
          →
        </Link>
        {giorno !== oggi && (
          <Link className="bottone secondario" href={con(oggi)}>
            Oggi
          </Link>
        )}
        <Scelta nome="istruttore" valore={istruttore} scelte={r.filtri.istruttori} tutti="Tutti gli istruttori" />
        <Scelta nome="lezione" valore={lezione} scelte={r.filtri.lezioni} tutti="Tutte le lezioni" />
        <Scelta nome="categoria" valore={categoria} scelte={r.filtri.categorie} tutti="Tutte le categorie" />
        <Scelta nome="sala" valore={sala} scelte={r.filtri.sale} tutti="Tutte le sale" />
        <button className="bottone" type="submit">
          Filtra
        </button>
        {conFiltri && <Link href={`/dashboard/appello-tutte?giorno=${giorno}`}>Azzera i filtri</Link>}
      </form>

      <div className="numeri">
        <div className="numero">
          <div className="etichetta">Lezioni</div>
          <div className="valore">{formatoCifra(r.lezioni.length)}</div>
          <div className="nota">{senzaPrenotati > 0 ? `${formatoCifra(senzaPrenotati)} senza prenotati` : 'tutte con prenotati'}</div>
        </div>
        <div className="numero">
          <div className="etichetta">Prenotati</div>
          <div className="valore">{formatoCifra(prenotati)}</div>
          <div className="nota">nelle lezioni del giorno</div>
        </div>
        <div className="numero">
          <div className="etichetta">Presenti</div>
          <div className="valore">{formatoCifra(presenti)}</div>
          <div className="nota">segnati finora</div>
        </div>
        <div className="numero">
          <div className="etichetta">Presenza</div>
          <div className="valore">{prenotatiIniziate ? `${Math.round((presentiIniziate / prenotatiIniziate) * 100)}%` : '—'}</div>
          <div className="nota">
            {prenotatiIniziate ? `${formatoCifra(presentiIniziate)} su ${formatoCifra(prenotatiIniziate)} nelle lezioni iniziate` : 'nessuna lezione ancora iniziata'}
          </div>
        </div>
      </div>

      {r.lezioni.length === 0 ? (
        <div className="scheda">
          <Vuoto>{conFiltri ? 'Nessuna lezione con questi filtri.' : 'Nessuna lezione in questo giorno.'}</Vuoto>
        </div>
      ) : (
        r.lezioni.map((l) => {
          const finita = l.fine ? Date.parse(l.fine) < adesso : Date.parse(l.inizio) + 3600_000 < adesso
          const p = l.prenotati.filter((x) => x.presente).length
          return (
            <details key={l.class_id} className="scheda" open={r.lezioni.length <= 6}>
              <summary>
                <strong>
                  {formatoOra(l.inizio)}
                  {l.fine ? `–${formatoOra(l.fine)}` : ''} · {l.lezione ?? 'Lezione'}
                </strong>{' '}
                <span className="piccolo attenuato">
                  {[l.sala, l.istruttore ?? 'nessun istruttore'].filter(Boolean).join(' · ')} · {formatoCifra(p)} presenti su {formatoCifra(l.prenotati.length)}
                  {l.posti ? ` (${formatoCifra(l.posti)} posti)` : ''}
                </span>
              </summary>
              {l.prenotati.length === 0 ? (
                <p className="vuoto">Nessun prenotato.</p>
              ) : (
                <ul className="appello-elenco">
                  {l.prenotati.map((x) => (
                    <li key={x.booking_id}>
                      <div className={`appello-riga${x.presente ? ' presente' : ''}`} style={{ cursor: 'default' }}>
                        <span aria-hidden="true">{x.presente ? '✓' : finita ? '✗' : '·'}</span>
                        <span>
                          {x.utente_id ? (
                            <Link href={`/dashboard/persone/${x.utente_id}`} target="_blank" rel="noopener noreferrer">
                              {x.cognome ?? ''} {x.nome ?? ''}
                            </Link>
                          ) : (
                            <>
                              {x.cognome ?? ''} {x.nome ?? ''}
                            </>
                          )}
                          <span className="piccolo attenuato">
                            {' '}
                            {x.presente ? (x.segnato_da ? `· segnato da ${x.segnato_da}` : '· presente') : finita ? '· assente' : ''}
                          </span>
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </details>
          )
        })
      )}
    </>
  )
}
