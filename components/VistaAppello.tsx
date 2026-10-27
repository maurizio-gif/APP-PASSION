import Link from 'next/link'
import type { Appello, AppelloTutte, LezioneAppello } from '@/lib/crm'
import { eta, formatoCifra, formatoData, formatoGiornoLungo, formatoOra, spostaGiorno } from '@/lib/formato'
import { AppelloLezione } from './AppelloLezione'
import { LegendaSegnali, Segnali } from './SegnaliAppello'
import { Accordion } from './FaseRighe'
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
    <span className="aiuto-testo">{children}</span>
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
          <LegendaSegnali />
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
          <LegendaSegnali />
        </div>
      </div>

      <VideoTutorial />

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
        <div className="scheda">
          <Vuoto>{conFiltri ? 'Nessuna lezione con questi filtri.' : 'Nessuna lezione in questo giorno.'}</Vuoto>
        </div>
      ) : (
        <>
          {giorno === oggi && !conFiltri && <ScorriAdesso />}
          {r.lezioni.map((l) => (
            <div key={l.class_id}>
              {adessoId === l.class_id && <div id="adesso" className="appello-adesso">Adesso</div>}
              <LezioneTabella l={l} aperta={prenotati <= 120 || r.lezioni.length <= 3} />
            </div>
          ))}
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

// Una lezione dell'Appello complessivo, solo da leggere (il nome non apre l'anagrafica del cliente): la testata scura (ora, lezione, sala,
// istruttore, presenti) e sotto la tabella dei prenotati, con i segnali e chi ha segnato la presenza.
function LezioneTabella({ l, aperta }: { l: LezioneAppello; aperta: boolean }) {
  const presenti = l.prenotati.filter((p) => p.presente).length
  return (
    <div id={`lezione-${l.class_id}`} className="appello-sezione">
      <Accordion
        aperto={aperta}
        corpoClasse="sotto-dati"
        titolo={
          <>
            {formatoOra(l.inizio)}
            {l.fine ? `–${formatoOra(l.fine)}` : ''} · {l.lezione ?? 'Lezione'}
            <span className="chip-gruppo">
              {l.sala && <span className="chip">{l.sala}</span>}
              <span className="chip">{l.istruttore ?? 'nessun istruttore'}</span>
              {l.posti ? <span className="chip">{l.posti} posti</span> : null}
              <span className={`chip${presenti ? '' : ' rosso'}`}>
                {presenti}/{l.prenotati.length} presenti
              </span>
            </span>
          </>
        }
      >
        {l.prenotati.length === 0 ? (
          <p className="vuoto nota-sotto">Nessun prenotato.</p>
        ) : (
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
        )}
      </Accordion>
    </div>
  )
}
