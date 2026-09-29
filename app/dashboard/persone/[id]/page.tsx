import { notFound } from 'next/navigation'
import { crm, linkPgm, type Operatore, type Scheda } from '@/lib/crm'
import {
  CONTROLLO, ESITO_DISDETTA, ESITO_RINNOVO, FONTE, formatoData, formatoDataOra, formatoEuro, formatoGiorno, formatoOra,
  MOTIVI_DISDETTA, oggiRoma, STATO_CONTRATTO, TIPO_SOCIO, TIPO_TASK, traduci,
} from '@/lib/formato'
import { Avviso, BollinoFase, BollinoFonte, Contatti, Provenienza, Riapri, Vuoto } from '@/components/Ui'
import { BottoneInvio } from '@/components/BottoneInvio'
import { NuovoTask } from '@/components/NuovoTask'
import { SceltaOperatore } from '@/components/SceltaOperatore'
import { puoGestireLead, puoVedere } from '@/lib/permessi'
import {
  aggiornaDisdetta, aggiornaProva, aggiornaRinnovo, assegnaLead, chiudiLead, completaTask, leadSuPerfectGym, prendiLead,
  riapriLead,
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
  // Gli abbonamenti arrivano gia' in ordine: il primo e' quello in corso.
  const [ultimo, ...precedenti] = s.socio?.contratti ?? []
  const controllo = (id: number) =>
    puoVedere(io, 'contratti') ? s.nuovi_contratti.find((n) => n.contract_id === id)?.controllo : undefined
  const rinnovi = s.rinnovi ?? []
  // Per cosa si fa il nuovo task: quello che della persona e' ancora aperto.
  // Il primo e' scelto; «nessuno» lo lascia solo alla persona.
  const per = [
    ...s.disdette.filter((d) => !d.esito).map((d) => ({ valore: `disdetta:${d.id}`, testo: `Disdetta del ${formatoData(d.data_disdetta)}` })),
    ...rinnovi.filter((r) => !r.esito).map((r) => ({ valore: `rinnovo:${r.id}`, testo: `Rinnovo, scade il ${formatoData(r.scadenza)}` })),
    ...s.prove.filter((pr) => !pr.esito).map((pr) => ({ valore: `prova:${pr.id}`, testo: `Pass fino al ${formatoData(pr.data_fine)}` })),
    ...(leadAperto ? [{ valore: `lead:${leadAperto.id}`, testo: `Lead ${traduci(FONTE, leadAperto.fonte)}` }] : []),
  ]

  return (
    <>
      <div className="testata">
        <div>
          <h1>{[p.nome, p.cognome].filter(Boolean).join(' ') || 'Senza nome'}</h1>
          <Contatti telefono={p.telefono} email={p.email} />
          <StatoCertificato c={s.socio?.certificato} />
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
                  <div className="azioni-scheda">
                    <Riapri
                      azione={riapriLead}
                      campi={{ lead: l.id, torna: qui }}
                      avviso={`riaprendo il lead si toglie l'esito «${l.fase === 'vinta' ? `Vinta${l.esito ? ` · ${l.esito}` : ''}` : 'Persa'}» e torna ${l.assegnato_a ? 'in gestione' : 'da gestire'}. Lo storico cambia.`}
                    />
                  </div>
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
                {pr.esito && pr.obiezione && (<><dt>Obiezione</dt><dd>{pr.obiezione}</dd></>)}
              </dl>
              {/* L'esito lo mette il mirror (20260929u): iscritto quando su
                  PerfectGym compare l'abbonamento, non iscritto 30 giorni dopo
                  la fine del pass. Chiusa non si modifica: si riapre, con
                  l'avviso; quella iscritta da sola no, tornerebbe iscritta. */}
              {pr.esito ? (
                <>
                  {pr.automatico && (
                    <p className="piccolo attenuato">
                      {pr.esito === 'iscritto'
                        ? `Segnata da sola: su PerfectGym c'è l'abbonamento${pr.abbonamento ? ` «${pr.abbonamento.piano}», firmato il ${formatoData(pr.abbonamento.dal)}` : ''}.`
                        : 'Chiusa da sola: nessun abbonamento entro 30 giorni dalla fine del pass.'}
                    </p>
                  )}
                  {pr.note && <p className="nota-socio">{pr.note}</p>}
                  {!(pr.automatico && pr.esito === 'iscritto') && (
                    <div className="azioni-scheda">
                      <Riapri
                        azione={aggiornaProva}
                        campi={{ prova: pr.id, torna: qui, esito: '', obiezione: pr.obiezione ?? '', note: pr.note ?? '' }}
                        avviso={
                          pr.esito === 'iscritto'
                            ? "riaprendo la prova si toglie l'esito «Iscritto» e torna aperta; Iscritto non si rimette a mano, torna da solo se su PerfectGym c'è l'abbonamento. Lo storico cambia."
                            : "riaprendo la prova si toglie l'esito «Non iscritto» e torna aperta. Lo storico cambia."
                        }
                      />
                    </div>
                  )}
                </>
              ) : (
                <form action={aggiornaProva} className="modulo">
                  <input type="hidden" name="prova" value={pr.id} />
                  <input type="hidden" name="torna" value={qui} />
                  <div className="due-colonne">
                    <div className="campo">
                      <label>Esito</label>
                      <select name="esito" defaultValue="">
                        <option value="">Ancora aperta</option>
                        <option value="non_iscritto">Non iscritto</option>
                      </select>
                    </div>
                    <div className="campo">
                      <label>Obiezione</label>
                      <input type="text" name="obiezione" defaultValue={pr.obiezione ?? ''} placeholder="Prezzo, orari, distanza…" />
                    </div>
                  </div>
                  <p className="piccolo attenuato">
                    Iscritto si segna da solo, quando su PerfectGym compare l&apos;abbonamento. Non iscritto da solo 30 giorni dopo la fine
                    del pass; prima, a mano.
                  </p>
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
              )}
            </section>
          ))}

          {/* Gli abbonamenti di PerfectGym, senza i certificati medici (che su
              PerfectGym sono contratti aggiuntivi): in vista quello in corso,
              gli altri nella tendina sotto. */}
          {s.socio && (
            <section className="scheda contratto">
              <h2>Abbonamenti</h2>
              {!ultimo ? (
                <Vuoto>Nessun abbonamento su PerfectGym.</Vuoto>
              ) : (
                <>
                  <Contratto c={ultimo} controllo={controllo(ultimo.id)} />
                  {precedenti.length > 0 && (
                    <details className="contratti-precedenti">
                      <summary>
                        <strong>Storico abbonamenti</strong> <span className="attenuato">· {precedenti.length}</span>
                      </summary>
                      {precedenti.map((c) => <Contratto key={c.id} c={c} controllo={controllo(c.id)} />)}
                    </details>
                  )}
                </>
              )}
            </section>
          )}

          {/* Rinnovi e disdette si gestiscono qui: da gestire, il modulo e'
              aperto; chiusi con l'esito, si leggono e si riaprono, con l'avviso. */}
          {rinnovi.map((r) => (
            <section className="scheda" key={r.id}>
              <div className="testata-scheda">
                <h2>Rinnovo</h2>
                <span className={`bollino ${r.esito === 'rinnovato' ? 'verde' : r.esito ? 'grigio' : 'giallo'}`}>
                  {r.esito ? traduci(ESITO_RINNOVO, r.esito) : 'Da gestire'}
                </span>
              </div>
              <p className="piccolo">
                scade il <strong>{formatoData(r.scadenza)}</strong>{r.piano ? ` · ${r.piano}` : ''} · lo segue {r.assegnato_nome ?? 'nessuno'}
              </p>
              {!puoVedere(io, 'rinnovi') ? (
                r.note && <p className="nota-socio">{r.note}</p>
              ) : r.esito ? (
                <>
                  {r.note && <p className="nota-socio">{r.note}</p>}
                  <div className="azioni-scheda">
                    <Riapri
                      azione={aggiornaRinnovo}
                      campi={{ rinnovo: r.id, torna: qui, esito: '', note: r.note ?? '' }}
                      avviso={`riaprendo il rinnovo si toglie l'esito «${traduci(ESITO_RINNOVO, r.esito)}» e torna da gestire. Lo storico cambia.`}
                    />
                  </div>
                </>
              ) : (
                <ModuloRinnovo r={r} staff={staff} torna={qui} />
              )}
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
                del <strong>{formatoData(d.data_disdetta)}</strong>{d.piano ? ` · ${d.piano}` : ''} · la segue {d.gestito_nome ?? 'nessuno'}
              </p>
              {!puoVedere(io, 'disdette') || d.esito ? (
                <>
                  {d.motivo && <p className="piccolo">Motivo: {d.motivo}</p>}
                  {d.note && <p className="nota-socio">{d.note}</p>}
                  {puoVedere(io, 'disdette') && d.esito && (
                    <div className="azioni-scheda">
                      <Riapri
                        azione={aggiornaDisdetta}
                        campi={{ disdetta: d.id, torna: qui, esito: '', contatto: d.contatto ?? '', motivo: d.motivo ?? '', note: d.note ?? '' }}
                        avviso={`riaprendo la disdetta si toglie l'esito «${traduci(ESITO_DISDETTA, d.esito)}» e torna da gestire. Lo storico cambia.`}
                      />
                    </div>
                  )}
                </>
              ) : (
                <ModuloDisdetta d={d} staff={staff} torna={qui} />
              )}
            </section>
          ))}

          {/* I task in un riquadro solo, che sul telefono resta insieme: prima
              lo storico, sotto il nuovo task. */}
          <section className="scheda">
            <h2>Task</h2>
            {task.length === 0 ? (
              <Vuoto>Nessun task: lo crei qui sotto.</Vuoto>
            ) : (
              <ol className="storia">
                {task.map((e) => (
                    <li key={e.id} className={`storia-task${e.archiviato ? ' archiviato' : e.completato_il ? ' fatto' : ''}`}>
                      <div className="storia-testa">
                        <span className="bollino">{traduci(TIPO_TASK, e.task_tipo)}</span>{' '}
                        <Provenienza origine={e.origine} />{' '}
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
            <div className="task-nuovo">
              <h3>Nuovo task</h3>
              <NuovoTask utente={p.id} per={per} torna={qui} staff={staff} io={io?.id ?? null} />
            </div>
          </section>
        </div>

        {/* ---- Colonna 2: chi e' su PerfectGym ---- */}
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
                </dl>
              </>
            )}
          </section>

          {s.socio && (
            <section className="scheda">
              <div className="testata-scheda">
                <h2>Ultimi accessi</h2>
                <span className="piccolo attenuato">{s.socio.ingressi_30gg} negli ultimi 30 giorni</span>
              </div>
              {s.socio.ingressi.length === 0 ? (
                <Vuoto>Nessun accesso registrato.</Vuoto>
              ) : (
                <ul className="punti">
                  {s.socio.ingressi.slice(0, 10).map((v, i) => (
                    <li key={i}>
                      <strong>{formatoGiorno(v.entrata)}</strong> · entrata {formatoOra(v.entrata)}
                      {v.uscita && v.uscita !== v.entrata ? `, uscita ${formatoOra(v.uscita)}` : ''}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {s.socio && (
            <section className="scheda">
              <h2>Prenotazioni</h2>
              {s.socio.prenotazioni.length === 0 ? (
                <Vuoto>Nessuna prenotazione.</Vuoto>
              ) : (
                <ul className="punti">
                  {s.socio.prenotazioni.slice(0, 10).map((b, i) => (
                    <li key={i}>
                      <strong>{formatoGiorno(b.inizio)}, {formatoOra(b.inizio)}</strong> · {b.lezione ?? 'Lezione'}{' '}
                      <StatoPrenotazione b={b} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

        </div>
      </div>
    </>
  )
}

type Socio = NonNullable<Scheda['socio']>

// Un abbonamento: il nome del piano, lo stato e le sue date.
function Contratto({ c, controllo }: { c: Socio['contratti'][number]; controllo?: string }) {
  return (
    <div className="abbonamento">
      <div className="testata-scheda">
        <h3>{c.piano ?? 'Contratto'}</h3>
        <span className={`bollino ${c.stato === 'Current' ? 'verde' : c.stato === 'NotStarted' ? 'giallo' : 'grigio'}`}>
          {traduci(STATO_CONTRATTO, c.stato)}
        </span>
      </div>
      <dl className="dati">
        <dt>Firmato il</dt><dd>{formatoData(c.data_firma)}</dd>
        <dt>Inizio</dt><dd>{formatoData(c.data_inizio)}</dd>
        {/* La fine dell'abbonamento, in evidenza. */}
        <dt>Fine</dt><dd><strong>{c.data_fine ? formatoData(c.data_fine) : 'a tempo indeterminato'}</strong></dd>
        <dt>Disdetta</dt><dd>{c.data_disdetta ? formatoData(c.data_disdetta) : '—'}</dd>
        <dt>Canone</dt><dd>{formatoEuro(c.canone)}</dd>
        {c.giorno_addebito != null && (<><dt>Addebito</dt><dd>il {c.giorno_addebito} del mese</dd></>)}
        <dt>Rinnovo automatico</dt><dd>{c.rinnovo_automatico ? 'sì' : 'no'}</dd>
        {c.aggiuntivo && (<><dt>Tipo</dt><dd>contratto aggiuntivo</dd></>)}
        {controllo && (<><dt>Controllo</dt><dd>{traduci(CONTROLLO, controllo)}</dd></>)}
      </dl>
    </div>
  )
}

// Il certificato medico nell'intestazione, dalla scadenza scritta su
// PerfectGym (custom attribute del socio): attivo fino a, scaduto il, non
// presente. Solo il certificato definitivo: il temporaneo qui non conta.
function StatoCertificato({ c }: { c: Socio['certificato'] | undefined }) {
  const oggi = oggiRoma()
  const scadenza = c?.scadenza ?? null
  const attivo = scadenza != null && scadenza >= oggi
  return (
    <div className="certificato">
      {!scadenza ? (
        <span><span className="bollino grigio">Certificato medico non presente</span></span>
      ) : attivo ? (
        <span><span className="bollino verde">Certificato medico attivo</span> scade il {formatoData(scadenza)}</span>
      ) : (
        <span><span className="bollino rosso">Certificato medico scaduto</span> il {formatoData(scadenza)}</span>
      )}
    </div>
  )
}

// Rinnovo e disdetta, dalla scheda: gli stessi campi delle loro sezioni.
function ModuloRinnovo({ r, staff, torna }: { r: NonNullable<Scheda['rinnovi']>[number]; staff: Operatore[]; torna: string }) {
  return (
    <form action={aggiornaRinnovo} className="modulo">
      <input type="hidden" name="rinnovo" value={r.id} />
      <input type="hidden" name="torna" value={torna} />
      <div className="due-colonne">
        <div className="campo">
          <label>Esito</label>
          <select name="esito" defaultValue={r.esito ?? ''}>
            <option value="">Ancora aperto</option>
            {Object.entries(ESITO_RINNOVO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="campo">
          <label>Lo segue</label>
          <SceltaOperatore staff={staff} attuale={r.assegnato_a} attualeNome={r.assegnato_nome} etichetta="Da assegnare" />
        </div>
      </div>
      <div className="campo">
        <label>Note</label>
        <input type="text" name="note" defaultValue={r.note ?? ''} />
      </div>
      <BottoneInvio testo="Salva il rinnovo" inCorso="Salvataggio…" />
    </form>
  )
}

function ModuloDisdetta({ d, staff, torna }: { d: Scheda['disdette'][number]; staff: Operatore[]; torna: string }) {
  return (
    <form action={aggiornaDisdetta} className="modulo">
      <input type="hidden" name="disdetta" value={d.id} />
      <input type="hidden" name="torna" value={torna} />
      <div className="due-colonne">
        <div className="campo">
          <label>Contatto</label>
          <select name="contatto" defaultValue={d.contatto ?? ''}>
            <option value="">Non ancora</option>
            <option value="telefonata">Telefonata</option>
            <option value="appuntamento">Appuntamento</option>
          </select>
        </div>
        <div className="campo">
          <label>Esito</label>
          <select name="esito" defaultValue={d.esito ?? ''}>
            <option value="">Da gestire</option>
            {Object.entries(ESITO_DISDETTA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="campo">
          <label>Motivo</label>
          <select name="motivo" defaultValue={d.motivo ?? ''}>
            <option value="">Non ancora</option>
            {d.motivo && !MOTIVI_DISDETTA.includes(d.motivo) && <option value={d.motivo}>{d.motivo}</option>}
            {MOTIVI_DISDETTA.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="campo">
          <label>La segue</label>
          <SceltaOperatore staff={staff} attuale={d.gestito_da} attualeNome={d.gestito_nome} etichetta="Da assegnare" />
        </div>
      </div>
      <div className="campo">
        <label>Note</label>
        <input type="text" name="note" defaultValue={d.note ?? ''} />
      </div>
      <BottoneInvio testo="Salva la disdetta" inCorso="Salvataggio…" />
    </form>
  )
}

function StatoPrenotazione({ b }: { b: Socio['prenotazioni'][number] }) {
  if (b.annullata) return <span className="bollino grigio">annullata</span>
  if (b.in_attesa) return <span className="bollino giallo">in lista d&apos;attesa</span>
  if (b.presente) return <span className="bollino verde">presente</span>
  if (new Date(b.inizio).getTime() > Date.now()) return <span className="bollino giallo">prenotata</span>
  return <span className="bollino rosso">assente</span>
}
