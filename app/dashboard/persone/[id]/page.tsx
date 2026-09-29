import Link from 'next/link'
import { notFound } from 'next/navigation'
import { crm, linkPgm, type Scheda } from '@/lib/crm'
import {
  CONTROLLO, ESITO_DISDETTA, formatoData, formatoDataOra, formatoEuro,
  STATO_CONTRATTO, TESSERAMENTO, TIPO_SOCIO, TIPO_TASK, traduci,
} from '@/lib/formato'
import { Avviso, BollinoFase, BollinoFonte, Contatti, Vuoto } from '@/components/Ui'
import { BottoneInvio } from '@/components/BottoneInvio'
import { NuovoTask } from '@/components/NuovoTask'
import { SceltaOperatore } from '@/components/SceltaOperatore'
import { puoGestireLead, puoVedere } from '@/lib/permessi'
import {
  aggiornaProva, assegnaLead, chiudiLead, completaTask, leadSuPerfectGym, prendiLead, riapriLead,
} from '../../azioni'

const VINTA_DA_SOLA = 'Vinta si segna da sola, quando su PerfectGym compare la prova o il contratto'

export default async function SchedaPersona({ params, searchParams }: { params: { id: string }; searchParams: { errore?: string; ok?: string } }) {
  const [s, io, staff] = await Promise.all([crm.persona(params.id), crm.io(), crm.staff()])
  if (!s) notFound()
  const p = s.persona
  const qui = `/dashboard/persone/${p.id}`
  // Nella scheda solo i task: i commenti (quelli di Airtable) non si mostrano.
  const task = s.storia.filter((e): e is Extract<Scheda['storia'][number], { tipo: 'task' }> => e.tipo === 'task')
  const leadAperto = s.lead.find((l) => l.fase === 'da_gestire' || l.fase === 'in_gestione')
  const pgm = linkPgm(p.member_id)

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
            const puo = puoGestireLead(io, l.assegnato_a)
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
                  {l.consenso_privacy != null && (<><dt>Privacy</dt><dd>{l.consenso_privacy ? 'Consenso dato' : 'Nessun consenso'}</dd></>)}
                  {l.origine === 'app' && (
                    <><dt>PerfectGym</dt><dd>
                      {l.pgm_stato === 'creato' ? <>Lead creato{l.pgm_lead_id ? ` (n. ${l.pgm_lead_id})` : ''}</>
                        : l.pgm_stato === 'gia_su_pgm' ? 'Già presente: nessun lead nuovo'
                        : l.pgm_stato === 'errore' ? <span className="testo-rosso">Non creato: {l.pgm_errore}</span>
                        : <span className="attenuato">non mandato</span>}
                    </dd></>
                  )}
                </dl>
                {l.note && <p className="nota-socio">{l.note}</p>}

                {l.origine === 'app' && (l.pgm_stato === 'errore' || !l.pgm_stato) && (
                  <form action={leadSuPerfectGym} className="azioni-scheda">
                    <input type="hidden" name="lead" value={l.id} />
                    <input type="hidden" name="torna" value={qui} />
                    <BottoneInvio testo={l.pgm_stato === 'errore' ? 'Riprova su PerfectGym' : 'Manda a PerfectGym'} inCorso="Invio…" classe="secondario piccolo" />
                  </form>
                )}

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
                      <input type="text" name="nota" placeholder="Perché è persa (facoltativo)" />
                      <button type="button" className="bottone" disabled title={VINTA_DA_SOLA}>Vinta: prova attivata</button>
                      <button type="button" className="bottone" disabled title={VINTA_DA_SOLA}>Vinta: contratto</button>
                      <button className="bottone secondario" name="chiusura" value="persa">Persa</button>
                      <p className="piccolo attenuato">{VINTA_DA_SOLA}.</p>
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
                <div className="campo">
                  <label>La segue</label>
                  <SceltaOperatore staff={staff} attuale={pr.gestito_da} attualeNome={pr.gestito_nome} etichetta="Da assegnare" />
                </div>
                <BottoneInvio testo="Salva la prova" inCorso="Salvataggio…" />
              </form>
            </section>
          ))}

          {/* I contratti di PerfectGym, uno per riquadro (prima «Nuovo contratto ·
              Controllato», con la sezione Nuovi contratti ora sospesa). */}
          {(s.socio?.contratti ?? []).map((c) => (
            <section className="scheda contratto" key={c.id}>
              <div className="testata-scheda">
                <h2>{c.piano ?? 'Contratto'}</h2>
                <span className={`bollino ${c.stato === 'Current' ? 'verde' : c.stato === 'NotStarted' ? 'giallo' : 'grigio'}`}>
                  {traduci(STATO_CONTRATTO, c.stato)}
                </span>
              </div>
              <dl className="dati">
                <dt>Firmato il</dt><dd>{formatoData(c.data_firma)}</dd>
                <dt>Inizio</dt><dd>{formatoData(c.data_inizio)}</dd>
                <dt>Fine</dt><dd>{c.data_fine ? formatoData(c.data_fine) : 'a tempo indeterminato'}</dd>
                <dt>Disdetta</dt><dd>{c.data_disdetta ? formatoData(c.data_disdetta) : '—'}</dd>
                <dt>Canone</dt><dd>{formatoEuro(c.canone)}</dd>
                {c.giorno_addebito != null && (<><dt>Addebito</dt><dd>il {c.giorno_addebito} del mese</dd></>)}
                <dt>Rinnovo automatico</dt><dd>{c.rinnovo_automatico ? 'sì' : 'no'}</dd>
                {c.aggiuntivo && (<><dt>Tipo</dt><dd>contratto aggiuntivo</dd></>)}
                {puoVedere(io, 'contratti') && s.nuovi_contratti.some((n) => n.contract_id === c.id) && (
                  <><dt>Controllo</dt><dd>{traduci(CONTROLLO, s.nuovi_contratti.find((n) => n.contract_id === c.id)!.controllo)}</dd></>
                )}
              </dl>
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
                {formatoData(d.data_disdetta)}{d.motivo ? ` · ${d.motivo}` : ''} · la segue {d.gestito_nome ?? 'nessuno'} ·{' '}
                <Link href="/dashboard/disdette?vista=tutte">vai alle disdette</Link>
              </p>
              {d.note && <p className="nota-socio">{d.note}</p>}
            </section>
          ))}

          <section className="scheda">
            <h2>Nuovo task</h2>
            <NuovoTask utente={p.id} lead={leadAperto?.id ?? null} torna={qui} staff={staff} io={io?.id ?? null} />
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
            <h2>Task</h2>
            {task.length === 0 ? (
              <Vuoto>Nessun task: lo crei qui accanto.</Vuoto>
            ) : (
              <ol className="storia">
                {task.map((e) => (
                    <li key={e.id} className={`storia-task${e.archiviato ? ' archiviato' : e.completato_il ? ' fatto' : ''}`}>
                      <div className="storia-testa">
                        <span className="bollino">{traduci(TIPO_TASK, e.task_tipo)}</span>{' '}
                        {e.archiviato ? `del ${formatoDataOra(e.data)} · archiviato` : e.completato_il ? `fatto ${formatoDataOra(e.completato_il)}` : `per ${formatoDataOra(e.data)}`}
                        {e.assegnato_nome ? ` · ${e.assegnato_nome}` : ''}
                        {e.esito && <span className={`bollino ${e.esito === 'positivo' ? 'verde' : 'rosso'}`}>{e.esito}</span>}
                      </div>
                      {e.nota && <div className="storia-testo">{e.nota}</div>}
                      {e.nota_esito && <div className="storia-testo"><strong>Com&apos;è andata:</strong> {e.nota_esito}</div>}
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
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
