import Link from 'next/link'
import { notFound } from 'next/navigation'
import { crm, linkPgm } from '@/lib/crm'
import {
  CONTROLLO, ESITO_DISDETTA, formatoData, formatoDataOra, formatoEuro, perInputDataOra,
  STATO_CONTRATTO, TESSERAMENTO, TIPO_SOCIO, TIPO_TASK, traduci,
} from '@/lib/formato'
import { Avviso, BollinoFase, BollinoFonte, Contatti, Vuoto } from '@/components/Ui'
import { BottoneInvio } from '@/components/BottoneInvio'
import {
  aggiornaProva, aggiungiCommento, assegnaLead, chiudiLead, completaTask, nuovoTask, prendiLead, riapriLead,
} from '../../azioni'

export default async function SchedaPersona({ params, searchParams }: { params: { id: string }; searchParams: { errore?: string; ok?: string } }) {
  const [s, io, staff] = await Promise.all([crm.persona(params.id), crm.io(), crm.staff()])
  if (!s) notFound()
  const p = s.persona
  const qui = `/dashboard/persone/${p.id}`
  const leadAperto = s.lead.find((l) => l.fase === 'da_gestire' || l.fase === 'in_gestione')
  const pgm = linkPgm(p.member_id)
  const domani = new Date(Date.now() + 24 * 3600 * 1000)
  domani.setHours(10, 0, 0, 0)

  return (
    <>
      <div className="testata">
        <div>
          <h1>{[p.nome, p.cognome].filter(Boolean).join(' ') || 'Senza nome'}</h1>
          <Contatti telefono={p.telefono} email={p.email} />
        </div>
        {pgm && <a className="bottone secondario" href={pgm} target="_blank" rel="noreferrer">Apri su PerfectGym ↗</a>}
      </div>
      <Avviso errore={searchParams.errore} ok={searchParams.ok} />

      <div className="griglia">
        {/* ---- Colonna 1: il lavoro ---- */}
        <div>
          {s.lead.map((l) => {
            const puo = io?.ruolo === 'admin' || !l.assegnato_a || l.assegnato_a === io?.id
            return (
              <section className="scheda" key={l.id}>
                <div className="testata-scheda">
                  <h2>Lead</h2>
                  <span>
                    <BollinoFonte fonte={l.fonte} dettaglio={l.fonte_dettaglio} /> <BollinoFase fase={l.fase} esito={l.esito} />
                  </span>
                </div>
                <dl className="dati">
                  <dt>Arrivato</dt><dd>{formatoDataOra(l.creato_il)}</dd>
                  {l.fonte_dettaglio && (<><dt>Da</dt><dd>{l.fonte_dettaglio}</dd></>)}
                  {l.attivita_interesse && (<><dt>Interesse</dt><dd>{l.attivita_interesse}</dd></>)}
                  {l.orario_ricontatto && (<><dt>Richiamare</dt><dd>{l.orario_ricontatto}</dd></>)}
                  {l.presentato_da && (<><dt>Presentato da</dt><dd>{l.presentato_da}</dd></>)}
                  <dt>In carico a</dt><dd>{l.assegnato_nome ?? <span className="attenuato">nessuno</span>}</dd>
                  {l.chiuso_il && (<><dt>Chiuso</dt><dd>{formatoDataOra(l.chiuso_il)}</dd></>)}
                </dl>
                {l.note && <p className="nota-socio">{l.note}</p>}

                {l.fase === 'da_gestire' && (
                  <form action={prendiLead} className="azioni-scheda">
                    <input type="hidden" name="lead" value={l.id} />
                    <input type="hidden" name="torna" value={qui} />
                    <button className="bottone">Prendo in carico</button>
                  </form>
                )}
                {(l.fase === 'da_gestire' || l.fase === 'in_gestione') && puo && (
                  <>
                    <form action={assegnaLead} className="azioni-scheda">
                      <input type="hidden" name="lead" value={l.id} />
                      <input type="hidden" name="torna" value={qui} />
                      <select name="staff" defaultValue={l.assegnato_a ?? ''} aria-label="Assegna a">
                        <option value="" disabled>Assegna a…</option>
                        {staff.map((o) => <option key={o.id} value={o.id}>{o.nome} {o.cognome ?? ''}</option>)}
                      </select>
                      <button className="bottone secondario">Assegna</button>
                    </form>
                    <form action={chiudiLead} className="azioni-scheda chiusura">
                      <input type="hidden" name="lead" value={l.id} />
                      <input type="hidden" name="torna" value={qui} />
                      <input type="text" name="nota" placeholder="Nota di chiusura (facoltativa)" />
                      <button className="bottone" name="chiusura" value="vinta_prova">Vinta: prova attivata</button>
                      <button className="bottone" name="chiusura" value="vinta_contratto">Vinta: contratto</button>
                      <button className="bottone secondario" name="chiusura" value="persa">Persa</button>
                    </form>
                  </>
                )}
                {(l.fase === 'vinta' || l.fase === 'persa') && puo && (
                  <form action={riapriLead} className="azioni-scheda">
                    <input type="hidden" name="lead" value={l.id} />
                    <input type="hidden" name="torna" value={qui} />
                    <button className="bottone secondario piccolo">Riapri</button>
                  </form>
                )}
              </section>
            )
          })}

          {s.prove.map((pr) => (
            <section className="scheda" key={pr.id}>
              <div className="testata-scheda">
                <h2>Prova</h2>
                <span className={`bollino ${pr.esito === 'iscritto' ? 'verde' : pr.esito ? 'grigio' : 'giallo'}`}>
                  {pr.esito === 'iscritto' ? 'Iscritto' : pr.esito === 'non_iscritto' ? 'Non iscritto' : 'In corso / senza esito'}
                </span>
              </div>
              <dl className="dati">
                <dt>Pass</dt><dd>{pr.tipo_pass ?? '—'}</dd>
                <dt>Dal</dt><dd>{formatoData(pr.data_inizio)} al {formatoData(pr.data_fine)}</dd>
                <dt>La segue</dt><dd>{pr.gestito_nome ?? <span className="attenuato">nessuno</span>}</dd>
              </dl>
              <form action={aggiornaProva} className="modulo">
                <input type="hidden" name="prova" value={pr.id} />
                <input type="hidden" name="torna" value={qui} />
                <div className="due-colonne">
                  <div className="campo">
                    <label>Esito</label>
                    <select name="esito" defaultValue={pr.esito ?? ''}>
                      <option value="">Ancora aperto</option>
                      <option value="iscritto">Iscritto</option>
                      <option value="non_iscritto">Non iscritto</option>
                    </select>
                  </div>
                  <div className="campo">
                    <label>Obiezione</label>
                    <input type="text" name="obiezione" defaultValue={pr.obiezione ?? ''} placeholder="Prezzo, orari, distanza…" />
                  </div>
                </div>
                <div className="campo">
                  <label>Note</label>
                  <input type="text" name="note" defaultValue={pr.note ?? ''} />
                </div>
                <label className="spunta"><input type="checkbox" name="gestisco" /> La seguo io</label>
                <BottoneInvio testo="Salva la prova" inCorso="Salvataggio…" />
              </form>
            </section>
          ))}

          {s.nuovi_contratti.map((n) => (
            <section className="scheda" key={n.contract_id}>
              <div className="testata-scheda">
                <h2>Nuovo contratto</h2>
                <span className={`bollino ${n.controllo === 'controllato' ? 'verde' : n.controllo === 'errore' ? 'rosso' : 'giallo'}`}>
                  {traduci(CONTROLLO, n.controllo)}
                </span>
              </div>
              <p className="piccolo">
                {traduci(TESSERAMENTO, n.tesseramento)}{n.numero_tessera ? ` · tessera ${n.numero_tessera}` : ''} ·{' '}
                <Link href="/dashboard/contratti?vista=tutti">vai ai controlli</Link>
              </p>
              {n.note && <p className="nota-socio">{n.note}</p>}
            </section>
          ))}

          {s.disdette.map((d) => (
            <section className="scheda" key={d.id}>
              <div className="testata-scheda">
                <h2>Disdetta</h2>
                <span className={`bollino ${d.esito === 'vinto' ? 'verde' : d.esito === 'perso' ? 'grigio' : 'giallo'}`}>
                  {d.esito ? traduci(ESITO_DISDETTA, d.esito) : 'Da gestire'}
                </span>
              </div>
              <p className="piccolo">
                {formatoData(d.data_disdetta)}{d.motivo ? ` · ${d.motivo}` : ''} · <Link href="/dashboard/disdette?vista=tutte">vai alle disdette</Link>
              </p>
              {d.note && <p className="nota-socio">{d.note}</p>}
            </section>
          ))}

          <section className="scheda">
            <h2>Scrivi</h2>
            <form action={aggiungiCommento} className="modulo">
              <input type="hidden" name="utente" value={p.id} />
              <input type="hidden" name="lead" value={leadAperto?.id ?? ''} />
              <input type="hidden" name="torna" value={qui} />
              <textarea name="testo" rows={3} required placeholder="Com'è andata la chiamata, cosa ha detto, cosa serve" />
              <BottoneInvio testo="Aggiungi commento" inCorso="Salvataggio…" />
            </form>
            <hr />
            <form action={nuovoTask} className="modulo">
              <input type="hidden" name="utente" value={p.id} />
              <input type="hidden" name="lead" value={leadAperto?.id ?? ''} />
              <input type="hidden" name="torna" value={qui} />
              <div className="due-colonne">
                <div className="campo">
                  <label>Task</label>
                  <select name="tipo" defaultValue="richiamare">
                    {Object.entries(TIPO_TASK).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="campo">
                  <label>Quando</label>
                  <input type="datetime-local" name="data" defaultValue={perInputDataOra(domani)} required />
                </div>
                <div className="campo">
                  <label>A chi</label>
                  <select name="assegnato" defaultValue={io?.id ?? ''}>
                    {staff.map((o) => <option key={o.id} value={o.id}>{o.nome} {o.cognome ?? ''}</option>)}
                  </select>
                </div>
                <div className="campo">
                  <label>Nota</label>
                  <input type="text" name="nota" placeholder="Cosa fare" />
                </div>
              </div>
              <BottoneInvio testo="Crea task" inCorso="Salvataggio…" />
            </form>
          </section>
        </div>

        {/* ---- Colonna 2: chi e', e la sua storia ---- */}
        <div>
          <section className="scheda">
            <h2>Su PerfectGym</h2>
            {!s.socio ? (
              <Vuoto>Non ancora agganciato a un socio di PerfectGym.</Vuoto>
            ) : (
              <>
                <dl className="dati">
                  <dt>Numero</dt><dd>{s.socio.numero}</dd>
                  <dt>Tipo</dt><dd>{traduci(TIPO_SOCIO, s.socio.tipo)}</dd>
                  {p.codice_fiscale && (<><dt>Codice fiscale</dt><dd>{p.codice_fiscale}</dd></>)}
                  {p.data_nascita && (<><dt>Nato il</dt><dd>{formatoData(p.data_nascita)}</dd></>)}
                  <dt>Saldo</dt><dd className={s.socio.saldo != null && s.socio.saldo < 0 ? 'negativo' : undefined}>{formatoEuro(s.socio.saldo)}</dd>
                  <dt>Ingressi</dt><dd>{s.socio.ingressi_30gg} negli ultimi 30 giorni</dd>
                </dl>
                {s.socio.contratti.length > 0 && (
                  <>
                    <h3 style={{ marginTop: 14 }}>Contratti</h3>
                    <ul className="elenco">
                      {s.socio.contratti.slice(0, 6).map((c) => (
                        <li key={c.id}>
                          <span className={`bollino ${c.stato === 'Current' ? 'verde' : ''}`}>{traduci(STATO_CONTRATTO, c.stato)}</span>{' '}
                          {c.piano} <span className="piccolo attenuato">· {formatoData(c.data_inizio)} → {formatoData(c.data_fine)}{c.data_disdetta ? ` · disdetto ${formatoData(c.data_disdetta)}` : ''}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {s.socio.ingressi.length > 0 && (
                  <>
                    <h3 style={{ marginTop: 14 }}>Ultimi ingressi</h3>
                    <p className="piccolo">{s.socio.ingressi.slice(0, 8).map((v) => formatoDataOra(v.entrata)).join(' · ')}</p>
                  </>
                )}
                {s.socio.prenotazioni.length > 0 && (
                  <>
                    <h3 style={{ marginTop: 14 }}>Lezioni</h3>
                    <ul className="elenco piccolo">
                      {s.socio.prenotazioni.slice(0, 8).map((b, i) => (
                        <li key={i}>
                          {formatoDataOra(b.inizio)} · {b.lezione ?? 'Lezione'}{' '}
                          {b.annullata ? <span className="bollino grigio">annullata</span> : b.presente ? <span className="bollino verde">presente</span> : null}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            )}
          </section>

          <section className="scheda">
            <h2>Storia</h2>
            {s.storia.length === 0 ? (
              <Vuoto>Ancora niente: il primo commento lo scrivi qui accanto.</Vuoto>
            ) : (
              <ol className="storia">
                {s.storia.map((e) =>
                  e.tipo === 'commento' ? (
                    <li key={e.id} className="storia-commento">
                      <div className="storia-testa">{e.autore ?? '—'} · {formatoDataOra(e.quando)}</div>
                      <div className="storia-testo">{e.testo}</div>
                    </li>
                  ) : (
                    <li key={e.id} className={`storia-task${e.completato_il ? ' fatto' : ''}`}>
                      <div className="storia-testa">
                        <span className="bollino">{traduci(TIPO_TASK, e.task_tipo)}</span>{' '}
                        {e.completato_il ? `fatto ${formatoDataOra(e.completato_il)}` : `per ${formatoDataOra(e.data)}`}
                        {e.assegnato_nome ? ` · ${e.assegnato_nome}` : ''}
                        {e.esito && <span className={`bollino ${e.esito === 'positivo' ? 'verde' : 'rosso'}`}>{e.esito}</span>}
                      </div>
                      {e.nota && <div className="storia-testo">{e.nota}</div>}
                      {!e.completato_il && (
                        <form action={completaTask} className="azioni-riga">
                          <input type="hidden" name="task" value={e.id} />
                          <input type="hidden" name="torna" value={qui} />
                          <input type="text" name="nota" placeholder="Com'è andata" />
                          <button className="bottone piccolo" name="esito" value="positivo">Fatto ✓</button>
                          <button className="bottone secondario piccolo" name="esito" value="negativo">Negativo</button>
                        </form>
                      )}
                    </li>
                  ),
                )}
              </ol>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
