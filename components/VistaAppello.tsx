import Link from 'next/link'
import type { Appello, AppelloTutte, LezioneAppello } from '@/lib/crm'
import { eta, formatoCifra, formatoData, formatoGiornoLungo, formatoOra, spostaGiorno } from '@/lib/formato'
import { AppelloLezione } from './AppelloLezione'
import { LegendaSegnali, Segnali } from './SegnaliAppello'
import { VideoTutorial } from './VideoTutorial'
import { ScorriAdesso } from './ScorriAdesso'
import { Vuoto } from './Ui'

// Le due pagine dell'appello, disegnate: la pagina vera (app/dashboard/appello*)
// e l'anteprima locale le usano tutte e due; `base` e' dove puntano i link e i
// moduli (/dashboard/appello, /anteprima/appello...). Le regole stanno nel database
// (supabase/migrations/20261027i_appello.sql).

const giornoRoma = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date(iso))

const Aiuto = ({ children }: { children: React.ReactNode }) => (
  <span className="aiuto-titolo" tabIndex={0} role="note" aria-label="Cos'è questa sezione">
    <span className="aiuto-punto" aria-hidden="true">?</span>
    <span className="aiuto-testo">
      {children}
      <LegendaSegnali />
    </span>
  </span>
)

// L'Appello istruttore: le lezioni di chi guarda e i loro prenotati.
export function VistaAppello({ a, singolo, oggi, base }: { a: Appello; singolo: string | null; oggi: string; base: string }) {
  const perGiorno = new Map<string, typeof a.lezioni>()
  for (const l of a.lezioni) {
    const g = giornoRoma(l.inizio)
    perGiorno.set(g, [...(perGiorno.get(g) ?? []), l])
  }
  const etichetta = (g: string) => (g === oggi ? `Oggi · ${formatoGiornoLungo(g)}` : g === spostaGiorno(oggi, 1) ? `Domani · ${formatoGiornoLungo(g)}` : formatoGiornoLungo(g))

  return (
    <>
      <div className="testata">
        <div>
          <div className="titolo-riga">
            <h1>Appello istruttore</h1>
            <Aiuto>
              Le tue lezioni e chi le ha prenotate, di oggi e dei prossimi giorni. La presenza si segna da 59 minuti prima dell&apos;inizio fino a 59 minuti dopo la
              fine della lezione: prima e dopo si legge soltanto.
              {a.istruttori.length > 0 && <> Sei collegato come {a.istruttori.join(', ')}.</>}
            </Aiuto>
          </div>
        </div>
      </div>

      <VideoTutorial />

      <form className="filtri filtri-largo" action={base}>
        {singolo && (
          <Link className="bottone secondario" href={`${base}?giorno=${spostaGiorno(singolo, -1)}`} aria-label="Giorno prima">
            ←
          </Link>
        )}
        <input type="date" name="giorno" defaultValue={singolo ?? ''} aria-label="Vai a un giorno" />
        <button className="bottone secondario" type="submit">
          Vai al giorno
        </button>
        {singolo && (
          <>
            <Link className="bottone secondario" href={`${base}?giorno=${spostaGiorno(singolo, 1)}`} aria-label="Giorno dopo">
              →
            </Link>
            <Link href={base}>Oggi e prossimi giorni</Link>
          </>
        )}
      </form>

      {!a.collegato ? (
        <div className="scheda">
          <Vuoto>
            Il tuo account non è collegato a un istruttore di PerfectGym: serve la stessa email che l&apos;istruttore ha su PerfectGym. Chiedi a un admin di controllarla.
          </Vuoto>
        </div>
      ) : a.lezioni.length === 0 ? (
        <div className="scheda">
          <Vuoto>{singolo ? 'Nessuna tua lezione in questo giorno.' : 'Nessuna tua lezione nei prossimi giorni.'}</Vuoto>
        </div>
      ) : (
        <>
          {!singolo && <ScorriAdesso />}
          {[...perGiorno.entries()].map(([giorno, lezioni]) => {
            // Oggi: «Adesso» sta davanti alla prima lezione non ancora finita; le gia' fatte restano sopra.
            const adesso = giorno === oggi ? lezioni.find((l) => Date.parse(l.fine ?? l.inizio) > Date.now()) : null
            return (
              <div key={giorno}>
                <h2 className="appello-giorno">{etichetta(giorno)}</h2>
                {lezioni.map((l) => (
                  <div key={l.class_id}>
                    {adesso?.class_id === l.class_id && !singolo && <div id="adesso" className="appello-adesso">Adesso</div>}
                    <AppelloLezione l={l} />
                  </div>
                ))}
              </div>
            )
          })}
        </>
      )}
    </>
  )
}

export type FiltriAppello = { istruttore: number | null; lezione: number | null; categoria: number | null; sala: number | null }

// L'Appello complessivo: tutte le lezioni di un giorno, di tutti. Solo da leggere.
export function VistaAppelloTutte({ r, giorno, oggi, filtri: scelti, base }: { r: AppelloTutte; giorno: string; oggi: string; filtri: FiltriAppello; base: string }) {
  const filtri = new URLSearchParams()
  for (const [k, v] of Object.entries(scelti)) if (v != null) filtri.set(k, String(v))
  const con = (g: string) => `${base}?giorno=${g}${filtri.toString() ? `&${filtri.toString()}` : ''}`
  const conFiltri = filtri.size > 0

  const adesso = Date.now()
  const prenotati = r.lezioni.reduce((a, l) => a + l.prenotati.length, 0)
  const presenti = r.lezioni.reduce((a, l) => a + l.prenotati.filter((p) => p.presente).length, 0)
  // La percentuale ha senso sulle lezioni finite o in corso: le future non hanno ancora presenze.
  const iniziate = r.lezioni.filter((l) => Date.parse(l.inizio) <= adesso)
  const prenotatiIniziate = iniziate.reduce((a, l) => a + l.prenotati.length, 0)
  const presentiIniziate = iniziate.reduce((a, l) => a + l.prenotati.filter((p) => p.presente).length, 0)
  const senzaPrenotati = r.lezioni.filter((l) => l.prenotati.length === 0).length
  // Passate: gia' finite. Future: in corso o ancora da fare. Un giorno passato e' tutto «passate», uno futuro tutto «future».
  const finita = (l: LezioneAppello) => Date.parse(l.fine ?? l.inizio) <= adesso
  const passate = r.lezioni.filter(finita)
  const future = r.lezioni.filter((l) => !finita(l))
  const apriFuture = future.length > 0
  // Oggi: «Adesso» sta davanti alla prima lezione non ancora finita.
  const adessoId = giorno === oggi ? r.lezioni.find((l) => Date.parse(l.fine ?? l.inizio) > adesso)?.class_id : null

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
          <div className="titolo-riga">
            <h1>Appello complessivo</h1>
            <Aiuto>
              {giorno === oggi ? 'Oggi, ' : ''}
              {formatoGiornoLungo(giorno)}. Tutte le lezioni del giorno, con chi ha prenotato e chi è presente. La presenza la segna l&apos;istruttore dal suo appello,
              da 59 minuti prima a 59 minuti dopo la lezione: qui si legge soltanto.
            </Aiuto>
          </div>
        </div>
      </div>

      <form className="filtri filtri-largo" action={base}>
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
        <Scelta nome="istruttore" valore={scelti.istruttore} scelte={r.filtri.istruttori} tutti="Tutti gli istruttori" />
        <Scelta nome="lezione" valore={scelti.lezione} scelte={r.filtri.lezioni} tutti="Tutte le lezioni" />
        <Scelta nome="categoria" valore={scelti.categoria} scelte={r.filtri.categorie} tutti="Tutte le categorie" />
        <Scelta nome="sala" valore={scelti.sala} scelte={r.filtri.sale} tutti="Tutte le sale" />
        <button className="bottone" type="submit">
          Filtra
        </button>
        {conFiltri && <Link href={`${base}?giorno=${giorno}`}>Azzera i filtri</Link>}
      </form>

      <div className="pf-tessere pf-tessere-quattro">
        <div className="pf-tessera">
          <div className="pf-testa">
            <span className="pf-titolo">Lezioni</span>
          </div>
          <div className="pf-valore">{formatoCifra(r.lezioni.length)}</div>
          <div className="pf-nota">{senzaPrenotati > 0 ? `${formatoCifra(senzaPrenotati)} senza prenotati` : 'tutte con prenotati'}</div>
        </div>
        <div className="pf-tessera">
          <div className="pf-testa">
            <span className="pf-titolo">Prenotati</span>
          </div>
          <div className="pf-valore">{formatoCifra(prenotati)}</div>
          <div className="pf-nota">nelle lezioni del giorno</div>
        </div>
        <div className="pf-tessera">
          <div className="pf-testa">
            <span className="pf-titolo">Presenti</span>
          </div>
          <div className="pf-valore">{formatoCifra(presenti)}</div>
          <div className="pf-nota">segnati finora</div>
        </div>
        <div className="pf-tessera">
          <div className="pf-testa">
            <span className="pf-titolo">Presenza</span>
          </div>
          <div className="pf-valore">{prenotatiIniziate ? `${Math.round((presentiIniziate / prenotatiIniziate) * 100)}%` : '—'}</div>
          <div className="pf-nota">
            {prenotatiIniziate ? `${formatoCifra(presentiIniziate)} su ${formatoCifra(prenotatiIniziate)} nelle lezioni iniziate` : 'nessuna lezione ancora iniziata'}
          </div>
        </div>
      </div>

      {r.lezioni.length === 0 ? (
        <>
        <div className="scheda">
          <Vuoto>{conFiltri ? 'Nessuna lezione con questi filtri.' : 'Nessuna lezione in questo giorno.'}</Vuoto>
        </div>
        <VideoTutorial />
        </>
      ) : (
        <>
          {giorno === oggi && !conFiltri && <ScorriAdesso />}
          <div className="na-toggle ap-toggle">
            <input type="radio" name="ap-vista" id="ap-v-fut" className="task-radio" defaultChecked={apriFuture} />
            <input type="radio" name="ap-vista" id="ap-v-pas" className="task-radio" defaultChecked={!apriFuture} />
            <div className="task-tabs na-tabs">
              <label htmlFor="ap-v-fut">
                Lezioni future <span>{future.length}</span>
              </label>
              <label htmlFor="ap-v-pas">
                Lezioni passate <span>{passate.length}</span>
              </label>
              <VideoTutorial inBarra />
            </div>
            <div className="na-pannello ap-fut">
              {future.length === 0 ? <p className="vuoto">Nessuna lezione ancora da fare.</p> : <CalendarioLezioni lezioni={future} adessoId={adessoId} />}
            </div>
            <div className="na-pannello ap-pas">
              {passate.length === 0 ? <p className="vuoto">Nessuna lezione ancora finita.</p> : <CalendarioLezioni lezioni={passate} adessoId={null} />}
            </div>
          </div>
        </>
      )}
    </>
  )
}

const breve = (completo: string | null) => {
  if (!completo) return '—'
  const [primo, ...resto] = completo.split(' ').filter(Boolean)
  return !primo || resto.length === 0 || completo.includes('@') ? completo : `${primo} ${resto[resto.length - 1][0]}.`
}

// L'Appello complessivo come un calendario del giorno: una fascia per ogni orario d'inizio, a sinistra l'ora
// e a destra le lezioni che partono in quell'ora, ognuna con i presenti e, aprendola, i prenotati (solo da leggere:
// il nome non apre l'anagrafica del cliente).
function CalendarioLezioni({ lezioni, adessoId }: { lezioni: LezioneAppello[]; adessoId: number | null | undefined }) {
  const fasce = new Map<string, LezioneAppello[]>()
  for (const l of lezioni) {
    const ora = formatoOra(l.inizio)
    fasce.set(ora, [...(fasce.get(ora) ?? []), l])
  }
  return (
    <div className="cal">
      {[...fasce.entries()].map(([ora, elenco]) => (
        <div key={ora} className="cal-fascia">
          <div className="cal-ora">
            <strong>{ora}</strong>
            <span>
              {elenco.length} {elenco.length === 1 ? 'lezione' : 'lezioni'}
            </span>
          </div>
          <div className="cal-lezioni">
            {elenco.map((l) => (
              <LezioneCalendario key={l.class_id} l={l} adesso={adessoId === l.class_id} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function LezioneCalendario({ l, adesso }: { l: LezioneAppello; adesso: boolean }) {
  const presenti = l.prenotati.filter((p) => p.presente).length
  const totale = l.prenotati.length
  const quota = totale ? Math.round((presenti / totale) * 100) : 0
  return (
    <article id={adesso ? 'adesso' : `lezione-${l.class_id}`} className={`cal-lezione${adesso ? ' in-corso' : ''}`}>
      <header className="cal-testa">
        <div>
          <h3 className="cal-titolo">{l.lezione ?? 'Lezione'}</h3>
          <div className="cal-orario">
            {formatoOra(l.inizio)}
            {l.fine ? `–${formatoOra(l.fine)}` : ''}
            {adesso && <span className="cal-adesso">Adesso</span>}
          </div>
        </div>
        <div className={`cal-conto${totale && !presenti ? ' nessuno' : ''}`}>
          <strong>
            {presenti}/{totale}
          </strong>
          <span>presenti</span>
        </div>
      </header>
      <div className="cal-barra" aria-hidden="true">
        <span style={{ width: `${quota}%` }} />
      </div>
      <dl className="cal-dati">
        <div>
          <dt>Istruttore</dt>
          <dd>{l.istruttore ?? 'nessuno'}</dd>
        </div>
        <div>
          <dt>Sala</dt>
          <dd>{l.sala ?? '—'}</dd>
        </div>
        {l.posti ? (
          <div>
            <dt>Posti</dt>
            <dd>{l.posti}</dd>
          </div>
        ) : null}
      </dl>
      {totale === 0 ? (
        <p className="cal-vuota">Nessun prenotato.</p>
      ) : (
        <details className="cal-prenotati">
          <summary>
            Prenotati <span>{totale}</span>
          </summary>
          <ul className="appello-elenco appello-compatto">
            {l.prenotati.map((p) => {
              const nome = `${p.nome ?? ''} ${p.cognome ?? ''}`.trim() || 'Senza nome'
              const chi = p.presente ? (p.segnato_il ? `${breve(p.segnato_da)} ${formatoOra(p.segnato_il)}` : 'tornello/PG') : null
              return (
                <li key={p.booking_id}>
                  <div className={`appello-riga${p.presente ? ' si' : ''}`}>
                    <span className="appello-check" aria-hidden="true">
                      {p.presente ? '✓' : ''}
                    </span>
                    <span className="appello-persona">
                      <span className="appello-nome">{nome}</span>
                      <span className="appello-dettagli">
                        {p.data_nascita && (
                          <span title={`Nato il ${formatoData(p.data_nascita)}`}>
                            {formatoData(p.data_nascita)} · {eta(p.data_nascita) ?? '—'} anni
                          </span>
                        )}
                        <Segnali p={p} />
                        {chi && <span>{chi}</span>}
                      </span>
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        </details>
      )}
    </article>
  )
}
