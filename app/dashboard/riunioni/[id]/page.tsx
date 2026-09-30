import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { crm } from '@/lib/crm'
import { formatoDataOra, formatoGiornoLungo } from '@/lib/formato'
import { puoRiunioni } from '@/lib/permessi'
import { ancora, ancoraDelMinuto, blocchiTrascrizione, conta, perPersona, STATO_AZIONE } from '@/lib/riunioni'
import { Avviso } from '@/components/Ui'
import { BarraAvanzamento, BollinoStato, TestoConMinuti } from '@/components/Riunione'
import { LinkMinuto } from '@/components/LinkMinuto'
import { aggiornaAzioneRiunione } from '../../azioni'

// Il report di una riunione: il riepilogo, le decisioni, i passaggi
// successivi con il loro stato (lo aggiornano superadmin e admin), gli
// argomenti con i minuti e, in fondo, la trascrizione completa da aprire o
// scaricare.
export default async function ReportRiunione({ params, searchParams }: { params: { id: string }; searchParams: { errore?: string } }) {
  const io = await crm.io()
  if (!puoRiunioni(io)) redirect(`/dashboard?errore=${encodeURIComponent('I report delle riunioni li vedono solo superadmin e admin.')}`)
  const [r, trascrizione] = await Promise.all([crm.riunione(params.id), crm.riunioneTrascrizione(params.id)])
  if (!r) notFound()

  const c = r.contenuto
  const concordato = c.concordato ?? []
  const daApprofondire = c.da_approfondire ?? []
  const dettagli = c.dettagli ?? []
  const n = conta(r.azioni)
  const persone = perPersona(r.azioni)
  const { blocchi, fine } = blocchiTrascrizione(trascrizione ?? '')
  const ancoraDi = (minuto: string) => ancoraDelMinuto(minuto, blocchi)
  // Un colore per chi parla, nell'ordine in cui interviene.
  const voci = [...new Set(blocchi.flatMap((b) => b.righe.map((x) => x.chi)).filter((x): x is string => Boolean(x)))]
  const qui = `/dashboard/riunioni/${r.id}`
  const giorno = formatoGiornoLungo(r.data)

  return (
    <>
      <div className="testata">
        <div>
          <Link href="/dashboard/riunioni" className="piccolo">← Report riunioni</Link>
          <p className="riunione-quando">
            {giorno.charAt(0).toUpperCase() + giorno.slice(1)} {r.data.slice(0, 4)}{r.ora ? ` · ore ${r.ora.slice(0, 5)}` : ''}{r.durata ? ` · ${r.durata}` : ''}
          </p>
          <h1>{r.titolo}</h1>
          <ul className="riunione-persone">
            {r.partecipanti.map((p) => <li key={p}>{p}</li>)}
          </ul>
        </div>
        <div className="riunione-azioni-testata">
          {trascrizione && <a className="bottone" href={`${qui}/trascrizione`} download>Scarica la trascrizione</a>}
          {r.fonte_url && <a className="bottone secondario" href={r.fonte_url} target="_blank" rel="noreferrer">Documento originale ↗</a>}
        </div>
      </div>
      <Avviso errore={searchParams.errore} />

      {/* Il riepilogo: la frase, le aree, i numeri. */}
      <section className="scheda riunione-riepilogo">
        {c.sintesi && <p className="riunione-sintesi">{c.sintesi}</p>}
        {!!c.aree?.length && (
          <div className="riunione-aree">
            {c.aree.map((a, i) => (
              <div key={a.titolo} className="riunione-area">
                <span className="riunione-area-n">{String(i + 1).padStart(2, '0')}</span>
                <h3>{a.titolo}</h3>
                <p>{a.testo}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="numeri">
        <a href="#decisioni" className="numero">
          <div className="etichetta">Decisioni</div>
          <div className="valore">{concordato.length + daApprofondire.length}</div>
          <div className="nota">{concordato.length} concordate{daApprofondire.length ? ` · ${daApprofondire.length} da approfondire` : ''}</div>
        </a>
        <a href="#passaggi" className="numero">
          <div className="etichetta">Passaggi successivi</div>
          <div className="valore">{n.totale}</div>
          <div className="nota">{n.fatto} fatti · {n.in_corso} in corso · {n.da_fare} da fare</div>
        </a>
        <a href="#argomenti" className="numero">
          <div className="etichetta">Argomenti</div>
          <div className="valore">{dettagli.length}</div>
          <div className="nota">con i minuti della trascrizione</div>
        </a>
        <a href="#trascrizione" className="numero">
          <div className="etichetta">Trascrizione</div>
          <div className="valore">{r.durata ?? '—'}</div>
          <div className="nota">{blocchi.reduce((t, b) => t + b.righe.length, 0)} interventi</div>
        </a>
      </div>

      {/* Le decisioni: quelle concordate, con quelle gia' nel CRM, e quelle da approfondire. */}
      <section className="scheda" id="decisioni">
        <h2>Decisioni</h2>
        <div className="riunione-decisioni">
          <div>
            <h3 className="riunione-sottotitolo">Concordato</h3>
            <ol className="riunione-lista">
              {concordato.map((d) => (
                <li key={d.titolo} className={d.nel_crm ? 'fatto' : undefined}>
                  <strong>{d.titolo}</strong>
                  <p>{d.testo}</p>
                  {d.nel_crm && <span className="bollino verde">{d.nel_crm}</span>}
                </li>
              ))}
            </ol>
          </div>
          {daApprofondire.length > 0 && (
            <div>
              <h3 className="riunione-sottotitolo">Da approfondire</h3>
              <ol className="riunione-lista approfondire">
                {daApprofondire.map((d) => (
                  <li key={d.titolo}>
                    <strong>{d.titolo}</strong>
                    <p>{d.testo}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </section>

      {/* I passaggi successivi: lo stato d'avanzamento, per persona e uno per uno. */}
      <section className="scheda" id="passaggi">
        <h2>Passaggi successivi</h2>
        <BarraAvanzamento fatto={n.fatto} in_corso={n.in_corso} totale={n.totale} />
        <ul className="riunione-per-persona">
          {persone.map((p) => (
            <li key={p.chi}>
              <strong>{p.chi}</strong> <span className="attenuato">{p.fatte}/{p.totale}</span>
              <span className="riunione-per-persona-barra"><span style={{ width: `${(p.fatte / p.totale) * 100}%` }} /></span>
            </li>
          ))}
        </ul>
        <ol className="riunione-passaggi">
          {r.azioni.map((a) => (
            <li key={a.id} className={`stato-${a.stato}`}>
              <div className="riunione-passaggio-testa">
                <BollinoStato stato={a.stato} />
                <strong>{a.titolo}</strong>
                <span className="riunione-chi">{a.chi.join(', ')}</span>
              </div>
              {a.descrizione && <p>{a.descrizione}</p>}
              {a.nota && <p className="riunione-nota">{a.nota}</p>}
              <details className="riunione-aggiorna">
                <summary className="piccolo">
                  Aggiorna{a.aggiornato_il ? ` · ultimo: ${a.aggiornato_nome ?? '—'}, ${formatoDataOra(a.aggiornato_il)}` : ''}
                </summary>
                <form action={aggiornaAzioneRiunione} className="azioni-riga">
                  <input type="hidden" name="azione" value={a.id} />
                  <input type="hidden" name="torna" value={`${qui}#passaggi`} />
                  <select name="stato" defaultValue={a.stato} aria-label="Stato" className="piccola">
                    {Object.entries(STATO_AZIONE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <input type="text" name="nota" defaultValue={a.nota ?? ''} placeholder="Nota: com'è andata, dove si trova" aria-label="Nota" />
                  <button className="bottone piccolo">Salva</button>
                </form>
              </details>
            </li>
          ))}
        </ol>
      </section>

      {/* Gli argomenti, in ordine: il minuto porta alla trascrizione. */}
      <section className="scheda" id="argomenti">
        <h2>Di cosa si è parlato</h2>
        <ol className="riunione-argomenti">
          {dettagli.map((d) => (
            <li key={d.titolo}>
              <div className="riunione-argomento-minuto">
                {d.minuto ? <LinkMinuto minuto={d.minuto} ancora={ancoraDi(d.minuto)} /> : <span className="minuto vuoto" />}
              </div>
              <div>
                <h3>{d.titolo}</h3>
                <p><TestoConMinuti testo={d.testo} ancoraDi={ancoraDi} /></p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* La trascrizione completa: chiusa, si apre con un clic o da un minuto. */}
      <details className="scheda riunione-trascrizione" id="trascrizione">
        <summary>
          <span>
            <strong>Trascrizione completa</strong>
            <span className="piccolo attenuato"> · {r.durata ?? ''} · {blocchi.length} blocchi · {voci.length} voci</span>
          </span>
          <span className="piccolo">Apri ▾</span>
        </summary>
        {trascrizione ? (
          <>
            <div className="riunione-trascrizione-barra">
              <ul className="riunione-voci">
                {voci.map((v, i) => <li key={v} className={`voce-${i % 5}`}>{v}</li>)}
              </ul>
              <a className="bottone secondario piccolo" href={`${qui}/trascrizione`} download>Scarica (.txt)</a>
            </div>
            {blocchi.map((b) => (
              <div key={b.minuto} className="riunione-blocco" id={ancora(b.minuto)}>
                <div className="riunione-blocco-minuto">{b.minuto}</div>
                <div>
                  {b.righe.map((x, i) => (
                    <p key={i}>
                      {x.chi && <strong className={`voce-${voci.indexOf(x.chi) % 5}`}>{x.chi}</strong>} {x.testo}
                    </p>
                  ))}
                </div>
              </div>
            ))}
            {fine && <p className="piccolo attenuato">{fine}.</p>}
          </>
        ) : (
          <p className="attenuato">La trascrizione non c&apos;è.</p>
        )}
      </details>
    </>
  )
}
