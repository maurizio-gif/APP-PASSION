import { notFound } from 'next/navigation'
import { crm, linkPgm, type Pagamento, type Scheda } from '@/lib/crm'
import { DatiPagamento } from '@/components/Bollini'
import {
  CONTROLLO, ESITO_DISDETTA, ESITO_RINNOVO, FONTE, formatoData, formatoDataOra, formatoEuro, formatoGiorno, formatoOra,
  MOTIVI_DISDETTA, oggiRoma, STATO_CONTRATTO, TIPO_SOCIO, TIPO_TASK, traduci,
} from '@/lib/formato'
import { Avviso, BollinoFase, BollinoFonte, Contatti, Provenienza, Riapri, Vuoto } from '@/components/Ui'
import { BottoneInvio } from '@/components/BottoneInvio'
import { NuovoTask } from '@/components/NuovoTask'
import { SceltaOperatore } from '@/components/SceltaOperatore'
import { InCarico } from '@/components/InCarico'
import { Iniziali } from '@/components/RigaProva'
import { AvatarTask, IconaTask } from '@/components/IconaTask'
import { Col, Fase, FaseVuota } from '@/components/FaseRighe'
import { puoGestire, puoVedere } from '@/lib/permessi'
import { TabellaTicket } from '@/components/Ticket'
import {
  aggiornaDisdetta, aggiornaProva, aggiornaRinnovo, assegnaDisdetta, assegnaLead, assegnaRinnovo, chiudiLead, completaTask,
  leadSuPerfectGym, prendiLead, riapriLead, rilasciaDisdetta, rilasciaLead, rilasciaRinnovo,
} from '../../azioni'

const VINTA_DA_SOLA = 'Vinta si segna da sola, quando su PerfectGym compare la prova o il contratto'

export default async function SchedaPersona({ params, searchParams }: { params: { id: string }; searchParams: { errore?: string; ok?: string } }) {
  const [s, io, staff] = await Promise.all([crm.persona(params.id), crm.io(), crm.staff()])
  if (!s) notFound()
  const p = s.persona
  // I ticket della persona, per chi vede la sezione Ticket.
  const ticket = puoVedere(io, 'ticket') ? await crm.ticketElenco('tutti', p.id) : null
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
  // Pagato o da pagare: per gli abbonamenti e per il Pass di ogni prova.
  const pagamenti = await crm.pagamenti([...(s.socio?.contratti ?? []).map((c) => c.id), ...s.prove.map((pr) => pr.contract_id)])
  // Per cosa si fa il nuovo task: quello che della persona e' ancora aperto.
  // Il primo e' scelto; «nessuno» lo lascia solo alla persona.
  const per = [
    ...s.disdette.filter((d) => !d.esito).map((d) => ({ valore: `disdetta:${d.id}`, testo: `Disdetta del ${formatoData(d.data_disdetta)}` })),
    ...rinnovi.filter((r) => !r.esito).map((r) => ({ valore: `rinnovo:${r.id}`, testo: `Rinnovo, scade il ${formatoData(r.scadenza)}` })),
    ...s.prove.filter((pr) => !pr.esito).map((pr) => ({ valore: `prova:${pr.id}`, testo: pr.data_fine ? `Pass fino al ${formatoData(pr.data_fine)}` : 'Prova senza pass su PerfectGym' })),
    ...(leadAperto ? [{ valore: `lead:${leadAperto.id}`, testo: `Opportunità ${traduci(FONTE, leadAperto.fonte)}` }] : []),
  ]

  const cartaLead = (l: Scheda['lead'][number]) => {
    const puo = puoGestire(io, l.assegnato_a)
    const daPgm = l.origine === 'app' && (l.pgm_stato === 'errore' || !l.pgm_stato)
    const aperto = l.fase === 'da_gestire' || l.fase === 'in_gestione'
    const azioni = daPgm || l.fase === 'da_gestire' || (aperto && puo) || ((l.fase === 'vinta' || l.fase === 'persa') && puo)
    return (
      <div key={l.id}>
        <Fase numero={1} nome="Opportunità">
          <Col titolo="Opportunità">
            <dl className="dati">
              <dt>Fonte</dt><dd>{traduci(FONTE, l.fonte)}</dd>
              <dt>Stato</dt><dd><BollinoFase fase={l.fase} esito={l.esito} /></dd>
              <dt>Arrivata</dt><dd>{formatoDataOra(l.creato_il)}</dd>
              {(l.richieste ?? 1) > 1 && (<><dt>Richieste</dt><dd>{l.richieste} volte{l.ultima_richiesta_il ? `, l'ultima il ${formatoDataOra(l.ultima_richiesta_il)}` : ''}</dd></>)}
              {l.fonte_dettaglio && (<><dt>Da</dt><dd>{l.fonte_dettaglio}</dd></>)}
              {l.presentato_da && (<><dt>Presentato da</dt><dd>{l.presentato_da}</dd></>)}
              {l.consenso_privacy != null && (<><dt>Privacy</dt><dd>{l.consenso_privacy ? 'Consenso dato' : 'Nessun consenso'}</dd></>)}
              {l.origine === 'app' && (
                <><dt>PerfectGym</dt><dd>
                  {l.pgm_stato === 'creato' ? <>Lead creato su PerfectGym{l.pgm_lead_id ? ` (n. ${l.pgm_lead_id})` : ''}</>
                    : l.pgm_stato === 'gia_su_pgm' ? 'Già presente: nessun lead nuovo'
                    : l.pgm_stato === 'errore' ? <span className="testo-rosso">Non creato: {l.pgm_errore}</span>
                    : <span className="attenuato">non mandato</span>}
                </dd></>
              )}
            </dl>
          </Col>
          <Col titolo="Gestione">
            <dl className="dati">
              {l.attivita_interesse && (<><dt>Interesse</dt><dd>{l.attivita_interesse}</dd></>)}
              {l.orario_ricontatto && (<><dt>Richiamare</dt><dd>{l.orario_ricontatto}</dd></>)}
              <dt>In carico a</dt><dd>{l.assegnato_nome ?? <span className="attenuato">nessuno</span>}</dd>
              {l.chiuso_il && (<><dt>Chiusa</dt><dd>{formatoDataOra(l.chiuso_il)}</dd></>)}
            </dl>
            {l.note && <p className="nota-socio">{l.note}</p>}
          </Col>
          <Col titolo="Azioni">
            {azioni && (
              <div className="fase-azioni">
                {daPgm && (
                  <form action={leadSuPerfectGym} className="azioni-riga">
                    <input type="hidden" name="lead" value={l.id} />
                    <input type="hidden" name="torna" value={qui} />
                    <BottoneInvio testo={l.pgm_stato === 'errore' ? 'Riprova su PerfectGym' : 'Manda a PerfectGym'} inCorso="Invio…" classe="secondario piccolo" />
                  </form>
                )}
                {l.fase === 'da_gestire' && (
                  <form action={prendiLead} className="azioni-riga">
                    <input type="hidden" name="lead" value={l.id} />
                    <input type="hidden" name="torna" value={qui} />
                    <button className="bottone piccolo">Prendo in carico</button>
                  </form>
                )}
                {aperto && puo && (
                  <>
                    <div className="azioni-gruppo fase-assegna">
                      <form action={assegnaLead} className="azioni-riga">
                        <input type="hidden" name="lead" value={l.id} />
                        <input type="hidden" name="torna" value={qui} />
                        <select name="staff" defaultValue={l.assegnato_a ?? ''} aria-label="Assegna a" className="piccola">
                          <option value="" disabled>Assegna a…</option>
                          {staff.map((o) => <option key={o.id} value={o.id}>{o.nome} {o.cognome ?? ''}</option>)}
                        </select>
                        <button className="bottone secondario piccolo">Assegna</button>
                      </form>
                      {l.fase === 'in_gestione' && (
                        <form action={rilasciaLead}>
                          <input type="hidden" name="lead" value={l.id} />
                          <input type="hidden" name="torna" value={qui} />
                          <button className="bottone secondario piccolo icona" title="Rimetti da assegnare: torna fra le opportunità da gestire, senza nessuno" aria-label="Rimetti da assegnare"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3" /></svg></button>
                        </form>
                      )}
                    </div>
                    <form action={chiudiLead} className="azioni-riga">
                      <input type="hidden" name="lead" value={l.id} />
                      <input type="hidden" name="torna" value={qui} />
                      <input type="text" name="nota" placeholder="Perché è persa (facoltativo)" />
                      <button className="bottone secondario piccolo" name="chiusura" value="persa">Persa</button>
                    </form>
                    <p className="piccolo attenuato aiuto aiuto-riga" title={`${VINTA_DA_SOLA}.`}>{VINTA_DA_SOLA}.</p>
                  </>
                )}
                {(l.fase === 'vinta' || l.fase === 'persa') && puo && (
                  <Riapri
                    azione={riapriLead}
                    campi={{ lead: l.id, torna: qui }}
                    avviso={`riaprendo l'opportunità si toglie l'esito «${l.fase === 'vinta' ? `Vinta${l.esito ? ` · ${l.esito}` : ''}` : 'Persa'}» e torna ${l.assegnato_a ? 'in gestione' : 'da gestire'}. Lo storico cambia.`}
                  />
                )}
              </div>
            )}
          </Col>
        </Fase>
      </div>
    )
  }

  const cartaProva = (pr: Scheda['prove'][number]) => (
    <div key={pr.id}>
      <Fase numero={2} nome="Prova">
        <Col titolo="Prova">
          <dl className="dati">
            <dt>Pass</dt><dd>{pr.tipo_pass ?? 'Prova'}</dd>
            <dt>Stato</dt>
            <dd>
              <span className={`bollino ${pr.esito === 'iscritto' ? 'verde' : pr.esito ? 'grigio' : 'giallo'}`}>
                {pr.esito === 'iscritto' ? 'Iscritto' : pr.esito === 'non_iscritto' ? 'Non iscritto' : 'In corso'}
              </span>
            </dd>
            <dt>Dal</dt><dd>{pr.data_fine ? `${formatoData(pr.data_inizio)} al ${formatoData(pr.data_fine)}` : `richiesta del ${formatoData(pr.data_inizio)}, senza pass su PerfectGym`}</dd>
            <DatiPagamento p={pr.contract_id != null ? pagamenti[pr.contract_id] : null} />
          </dl>
        </Col>
        <Col titolo="Gestione">
          <dl className="dati">
            <dt>La segue</dt><dd>{pr.gestito_nome ?? <span className="attenuato">nessuno</span>}</dd>
            {pr.esito && pr.obiezione && (<><dt>Obiezione</dt><dd>{pr.obiezione}</dd></>)}
          </dl>
          {pr.esito && pr.automatico && (
            <p className="piccolo attenuato">
              {pr.esito === 'iscritto'
                ? `Segnata da sola: su PerfectGym c'è l'abbonamento${pr.abbonamento ? ` «${pr.abbonamento.piano}», firmato il ${formatoData(pr.abbonamento.dal)}` : ''}.`
                : 'Chiusa da sola: nessun abbonamento entro 30 giorni dalla fine del pass.'}
            </p>
          )}
          {pr.esito && pr.note && <p className="nota-socio">{pr.note}</p>}
        </Col>
        <Col titolo="Azioni">
          {/* L'esito lo mette il mirror (20260929u): iscritto quando su
              PerfectGym compare l'abbonamento, non iscritto 30 giorni dopo
              la fine del pass. Chiusa non si modifica: si riapre, con
              l'avviso; quella iscritta da sola no, tornerebbe iscritta. */}
          {pr.esito ? (
            !(pr.automatico && pr.esito === 'iscritto') && (
              <div className="fase-azioni">
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
            )
          ) : (
            <form action={aggiornaProva} className="fase-azioni">
              <input type="hidden" name="prova" value={pr.id} />
              <input type="hidden" name="torna" value={qui} />
              <div className="azioni-riga">
                <select name="esito" defaultValue="" aria-label="Esito">
                  <option value="">Ancora aperta</option>
                  <option value="non_iscritto">Non iscritto</option>
                </select>
                <SceltaOperatore staff={staff} attuale={pr.gestito_da} attualeNome={pr.gestito_nome} etichetta="Da assegnare" />
                <BottoneInvio testo="Salva la prova" inCorso="Salvataggio…" classe="piccolo" />
              </div>
              <div className="azioni-riga">
                <input type="text" name="obiezione" defaultValue={pr.obiezione ?? ''} placeholder="Obiezione: prezzo, orari, distanza…" aria-label="Obiezione" />
                <input type="text" name="note" defaultValue={pr.note ?? ''} placeholder="Note" aria-label="Note" />
              </div>
              <p className="piccolo attenuato aiuto aiuto-riga" title="Iscritto si segna da solo, quando su PerfectGym compare l'abbonamento. Non iscritto da solo 30 giorni dopo la fine del pass; prima, a mano.">Iscritto si segna da solo; non iscritto da solo 30 giorni dopo la fine del pass.</p>
            </form>
          )}
        </Col>
      </Fase>
    </div>
  )

  // Aperti in vista, chiusi nello storico sotto.
  function conStorico<T>(voci: T[], aperto: (x: T) => boolean, carta: (x: T) => React.ReactNode, titolo: string) {
    const aperti = voci.filter(aperto)
    const chiusi = voci.filter((x) => !aperto(x))
    return (
      <>
        {aperti.map(carta)}
        {chiusi.length > 0 && (
          <details className="storico-fase" open={aperti.length === 0 && chiusi.length === 1}>
            <summary>{titolo} <span className="attenuato">· {chiusi.length}</span></summary>
            {chiusi.map(carta)}
          </details>
        )}
      </>
    )
  }

  // Task aperti (gli scaduti prima) e fatti: solo come si mostrano, i dati sono gli stessi.
  const scaduto = (e: (typeof task)[number]) => e.data != null && new Date(e.data).getTime() < Date.now()
  const daFare = task.filter((e) => !e.completato_il && !e.archiviato).sort((x, y) => Number(scaduto(y)) - Number(scaduto(x)))
  const fatti = task.filter((e) => e.completato_il || e.archiviato)
  const scaduti = daFare.filter(scaduto).length

  return (
    <>
      <Avviso errore={searchParams.errore} ok={searchParams.ok} />

      {/* ---- Chi e': nome, contatti, i numeri che contano, il percorso ---- */}
      <section className="scheda persona-testa">
        <div className="persona-chi">
          <Iniziali nome={p.nome} cognome={p.cognome} classe="grandi" />
          <div className="persona-nome">
            <h1>{[p.nome, p.cognome].filter(Boolean).join(' ') || 'Senza nome'}</h1>
            <Contatti telefono={p.telefono} email={p.email} grande />
            <StatoCertificato c={s.socio?.certificato} />
          </div>
          {pgm && <a className="bottone secondario piccolo persona-pgm" href={pgm} target="_blank" rel="noreferrer">Apri su PerfectGym ↗</a>}
        </div>
        <dl className="persona-fatti">
          {s.socio ? (
            <>
              <div><dt>N. socio</dt><dd>{s.socio.numero}</dd></div>
              <div><dt>Tipo</dt><dd>{traduci(TIPO_SOCIO, s.socio.tipo)}</dd></div>
              <div><dt>Saldo</dt><dd className={s.socio.saldo != null && s.socio.saldo < 0 ? 'negativo' : undefined}>{formatoEuro(s.socio.saldo)}</dd></div>
              <div><dt>Accessi in 30 giorni</dt><dd>{s.socio.ingressi_30gg}</dd></div>
            </>
          ) : (
            <div><dt>PerfectGym</dt><dd className="attenuato">non ancora agganciato a un socio</dd></div>
          )}
          {s.socio && p.codice_fiscale && <div><dt>Codice fiscale</dt><dd>{p.codice_fiscale}</dd></div>}
          {s.socio && p.data_nascita && <div><dt>Nato il</dt><dd>{formatoData(p.data_nascita)}</dd></div>}
        </dl>
      </section>

      {/* ---- Task: il lavoro di questa persona, in cima. Da fare (gli scaduti prima) e fatti. ---- */}
      <details className="fase-righe task-fase">
        <summary className="fase-titolo">
          Task
          <span className="chip-gruppo">
            <span className="chip">{daFare.length} da fare</span>
            {scaduti > 0 && <span className="chip rosso">{scaduti} scaduti</span>}
          </span>
          <span className="task-apri" aria-hidden="true" />
</summary>
        <section className="scheda fase-corpo task-corpo">
          <div className="task-griglia">
<div className="task-nuovo">
            <NuovoTask utente={p.id} per={per} torna={qui} staff={staff} io={io?.id ?? null} />
          </div>
          <div className="task-elenco">
<input type="radio" name="task-vista" id="task-v-fare" className="task-radio" defaultChecked />
<input type="radio" name="task-vista" id="task-v-fatti" className="task-radio" />
<div className="task-tabs">
<label htmlFor="task-v-fare">Da fare <span>{daFare.length}</span></label>
<label htmlFor="task-v-fatti">Fatti <span>{fatti.length}</span></label>
</div>
            <div className="task-col task-col-fare">
              <h3 className="task-gruppo">Da fare <span className="conta-titolo">{daFare.length}</span></h3>
              {daFare.length === 0 ? <p className="task-vuoto">Niente da fare su questa persona.</p> : (
                <ol className="task-lista">
                  {daFare.map((e) => {
                    const tardi = scaduto(e)
                    return (
                      <li key={e.id} className={`task-voce${tardi ? ' scaduta' : ''}`}>
                        <div className="task-riga">
                          <IconaTask tipo={e.task_tipo} /><b className="task-tipo">{traduci(TIPO_TASK, e.task_tipo)}</b>
                          <Provenienza origine={e.origine} />
                          <span className="task-quando">{tardi ? 'era per' : 'per'} <b>{formatoDataOra(e.data)}</b></span>
                          {tardi && <span className="bollino rosso">scaduto</span>}
                          {e.assegnato_nome && <span className="task-chi"><AvatarTask nome={e.assegnato_nome} />{e.assegnato_nome}</span>}
                        </div>
                        {e.nota && <div className="task-nota">{e.nota}</div>}
                        <form action={completaTask} className="azioni-riga task-chiudi">
                          <input type="hidden" name="task" value={e.id} />
                          <input type="hidden" name="torna" value={qui} />
                          <input type="text" name="nota" placeholder="Com'è andata" aria-label="Com'è andata" />
                          <button className="bottone piccolo" name="esito" value="positivo">Fatto ✓</button>
                          <button className="bottone secondario piccolo" name="esito" value="negativo">Negativo</button>
                        </form>
                      </li>
                    )
                  })}
                </ol>
              )}
            </div>
            <div className="task-col task-col-fatti">
              <h3 className="task-gruppo">Fatti <span className="conta-titolo">{fatti.length}</span></h3>
              {fatti.length === 0 ? <p className="task-vuoto">Ancora nessun task fatto.</p> : (
                <ol className="task-lista">
                  {fatti.map((e) => (
                    <li key={e.id} className={`task-voce task-chiuso${e.archiviato ? ' archiviata' : ''}`}>
                      <div className="task-riga">
                        <IconaTask tipo={e.task_tipo} /><b className="task-tipo">{traduci(TIPO_TASK, e.task_tipo)}</b>
                        <Provenienza origine={e.origine} />
                        <span className="task-quando">{e.archiviato ? 'del' : 'fatto'} <b>{formatoDataOra(e.archiviato ? e.data : e.completato_il)}</b>{e.archiviato ? ' · archiviato' : ''}</span>
                        {e.esito && <span className={`bollino ${e.esito === 'positivo' ? 'verde' : 'rosso'}`}>{e.esito}</span>}
                        {e.assegnato_nome && <span className="task-chi"><AvatarTask nome={e.assegnato_nome} />{e.assegnato_nome}</span>}
                      </div>
                      {e.nota && <div className="task-nota">{e.nota}</div>}
                      {e.nota_esito && <div className="task-nota"><span><strong>Com&apos;è andata:</strong> {e.nota_esito}</span></div>}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
</div>
        </section>
      </details>

      {/* ---- Le fasi una sotto l'altra: lead, prova, abbonamento, poi rinnovo e disdetta ---- */}
      <div className="funnel funnel-righe">
        {s.lead.length === 0
          ? <FaseVuota numero={1} nome="Opportunità" testo="Nessuna opportunità." />
          : conStorico(s.lead, (l) => l.fase === 'da_gestire' || l.fase === 'in_gestione', cartaLead, 'Storico opportunità')}

        {s.prove.length === 0
          ? <FaseVuota numero={2} nome="Prova" testo="Nessuna prova." />
          : conStorico(s.prove, (pr) => !pr.esito, cartaProva, 'Storico prove')}

        {/* Gli abbonamenti di PerfectGym, senza i certificati medici (che su
            PerfectGym sono contratti aggiuntivi): in vista quello in corso,
            gli altri nella tendina sotto. */}
        {!ultimo ? (
          <FaseVuota numero={3} nome="Abbonamento" testo={s.socio ? 'Nessun abbonamento su PerfectGym.' : 'Non ancora iscritto.'} />
        ) : (
          <div>
            <Contratto c={ultimo} controllo={controllo(ultimo.id)} pagamento={pagamenti[ultimo.id]} />
            {precedenti.length > 0 && (
              <details className="storico-fase">
                <summary>Storico abbonamenti <span className="attenuato">· {precedenti.length}</span></summary>
                {precedenti.map((c) => <Contratto key={c.id} c={c} controllo={controllo(c.id)} pagamento={pagamenti[c.id]} />)}
              </details>
            )}
          </div>
        )}

        {/* Rinnovi e disdette si gestiscono qui, come i lead: si prendono in
            carico, e chi li ha (o un admin) scrive l'esito; chiusi con l'esito,
            si leggono e si riaprono, con l'avviso. */}
        {rinnovi.map((r) => {
          const puo = puoVedere(io, 'rinnovi') && puoGestire(io, r.assegnato_a)
          return (
            <Fase key={r.id} nome="Rinnovo">
              <Col titolo="Rinnovo">
                <dl className="dati">
                  <dt>Scade il</dt><dd><strong>{formatoData(r.scadenza)}</strong></dd>
                  {r.piano && (<><dt>Piano</dt><dd>{r.piano}</dd></>)}
                  <dt>Stato</dt>
                  <dd>
                    <span className={`bollino ${r.esito === 'rinnovato' ? 'verde' : r.esito ? 'grigio' : 'giallo'}`}>
                      {r.esito ? traduci(ESITO_RINNOVO, r.esito) : r.assegnato_a ? 'In gestione' : 'Da gestire'}
                    </span>
                  </dd>
                </dl>
              </Col>
              <Col titolo="Gestione">
                <dl className="dati">
                  <dt>Lo segue</dt><dd>{r.assegnato_nome ?? <span className="attenuato">nessuno</span>}</dd>
                </dl>
                {(!puo || r.esito) && r.note && <p className="nota-socio">{r.note}</p>}
              </Col>
              <Col titolo="Azioni">
                {puo && r.esito && (
                  <div className="fase-azioni">
                    <Riapri
                      azione={aggiornaRinnovo}
                      campi={{ rinnovo: r.id, torna: qui, esito: '', note: r.note ?? '' }}
                      avviso={`riaprendo il rinnovo si toglie l'esito «${traduci(ESITO_RINNOVO, r.esito)}» e torna ${r.assegnato_a ? 'in gestione' : 'da gestire'}. Lo storico cambia.`}
                    />
                  </div>
                )}
                {puoVedere(io, 'rinnovi') && !r.esito && (
                  <div className="fase-azioni">
                    <InCarico id={r.id} assegnatoA={r.assegnato_a} assegnatoNome={r.assegnato_nome} aperto io={io} staff={staff}
                      torna={qui} assegna={assegnaRinnovo} rilascia={rilasciaRinnovo} completo />
                    {puo && <ModuloRinnovo r={r} torna={qui} />}
                  </div>
                )}
              </Col>
            </Fase>
          )
        })}

        {s.disdette.map((d) => {
          const puo = puoVedere(io, 'disdette') && puoGestire(io, d.gestito_da ?? null)
          const aperta = !d.esito || d.esito === 'standby'
          return (
            <Fase key={d.id} nome="Disdetta">
              <Col titolo="Disdetta">
                <dl className="dati">
                  <dt>Disdetta il</dt><dd><strong>{formatoData(d.data_disdetta)}</strong></dd>
                  {d.piano && (<><dt>Piano</dt><dd>{d.piano}</dd></>)}
                  <dt>Stato</dt>
                  <dd>
                    <span className={`bollino ${d.esito === 'vinto' ? 'verde' : d.esito === 'perso' ? 'grigio' : 'giallo'}`}>
                      {d.esito ? traduci(ESITO_DISDETTA, d.esito) : d.gestito_da ? 'In gestione' : 'Da gestire'}
                    </span>
                  </dd>
                </dl>
              </Col>
              <Col titolo="Gestione">
                <dl className="dati">
                  <dt>La segue</dt><dd>{d.gestito_nome ?? <span className="attenuato">nessuno</span>}</dd>
                  {!(puo && aperta) && d.motivo && (<><dt>Motivo</dt><dd>{d.motivo}</dd></>)}
                </dl>
                {(!puo || (d.esito && d.esito !== 'standby')) && d.note && <p className="nota-socio">{d.note}</p>}
              </Col>
              <Col titolo="Azioni">
                {puo && d.esito && d.esito !== 'standby' && (
                  <div className="fase-azioni">
                    <Riapri
                      azione={aggiornaDisdetta}
                      campi={{ disdetta: d.id, torna: qui, esito: '', contatto: d.contatto ?? '', motivo: d.motivo ?? '', note: d.note ?? '' }}
                      avviso={`riaprendo la disdetta si toglie l'esito «${traduci(ESITO_DISDETTA, d.esito)}» e torna ${d.gestito_da ? 'in gestione' : 'da gestire'}. Lo storico cambia.`}
                    />
                  </div>
                )}
                {puoVedere(io, 'disdette') && aperta && (
                  <div className="fase-azioni">
                    <InCarico id={d.id} assegnatoA={d.gestito_da ?? null} assegnatoNome={d.gestito_nome ?? null} aperto io={io} staff={staff}
                      torna={qui} assegna={assegnaDisdetta} rilascia={rilasciaDisdetta} completo />
                    {puo && <ModuloDisdetta d={d} torna={qui} />}
                  </div>
                )}
              </Col>
            </Fase>
          )
        })}
      </div>

      {/* ---- Il lavoro e la presenza in palestra ---- */}
      <div className="persona-sotto">
        <div>
          {ticket && (
            <div className="fase-righe sotto-fase sotto-tick">
<div className="fase-titolo">Ticket
<a className="bottone secondario piccolo fase-azione" href={`/dashboard/ticket/nuovo?persona=${p.id}`}>+ Apri un ticket</a>
</div>
<section className="scheda fase-corpo sotto-corpo sotto-tabella">
              {ticket.length === 0
                ? <Vuoto>Nessun ticket su questa persona.</Vuoto>
                : <TabellaTicket ticket={ticket} socio={false} />}
            </section>
</div>
          )}
        </div>

        <div>
          {s.socio && (
            <div className="fase-righe sotto-fase sotto-acc">
<div className="fase-titolo">Ultimi accessi
<span className="fase-nota">{s.socio.ingressi_30gg} in 30 giorni</span>
</div>
<section className="scheda fase-corpo sotto-corpo">
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
</div>
          )}

          {s.socio && (
            <div className="fase-righe sotto-fase sotto-pren">
<div className="fase-titolo">Prenotazioni</div>
<section className="scheda fase-corpo sotto-corpo">
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
</div>
          )}
        </div>
      </div>
    </>
  )
}


type Socio = NonNullable<Scheda['socio']>

// Un abbonamento: il piano, la durata e il pagamento, in tre colonne.
function Contratto({ c, controllo, pagamento }: { c: Socio['contratti'][number]; controllo?: string; pagamento?: Pagamento }) {
  return (
    <Fase numero={3} nome="Abbonamento">
      <Col titolo="Abbonamento">
        <dl className="dati">
          <dt>Piano</dt><dd>{c.piano ?? 'Contratto'}</dd>
          <dt>Stato</dt>
          <dd>
            <span className={`bollino ${c.stato === 'Current' ? 'verde' : c.stato === 'NotStarted' ? 'giallo' : 'grigio'}`}>
              {traduci(STATO_CONTRATTO, c.stato)}
            </span>
          </dd>
          <dt>Firmato il</dt><dd>{formatoData(c.data_firma)}</dd>
          {c.aggiuntivo && (<><dt>Tipo</dt><dd>contratto aggiuntivo</dd></>)}
          {controllo && (<><dt>Controllo</dt><dd>{traduci(CONTROLLO, controllo)}</dd></>)}
        </dl>
      </Col>
      <Col titolo="Durata">
        <dl className="dati">
          <dt>Inizio</dt><dd>{formatoData(c.data_inizio)}</dd>
          {/* La fine dell'abbonamento, in evidenza. */}
          <dt>Fine</dt><dd><strong>{c.data_fine ? formatoData(c.data_fine) : 'a tempo indeterminato'}</strong></dd>
          <dt>Disdetta</dt><dd>{c.data_disdetta ? formatoData(c.data_disdetta) : '—'}</dd>
          <dt>Rinnovo auto.</dt><dd>{c.rinnovo_automatico ? 'sì' : 'no'}</dd>
        </dl>
      </Col>
      <Col titolo="Pagamento">
        <dl className="dati">
          <dt>Canone</dt><dd>{formatoEuro(c.canone)}</dd>
          {c.giorno_addebito != null && (<><dt>Addebito</dt><dd>il {c.giorno_addebito} del mese</dd></>)}
          <DatiPagamento p={pagamento} />
        </dl>
      </Col>
    </Fase>
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

// Rinnovo e disdetta, dalla scheda: l'esito e le note. Chi li segue si cambia
// con «Assegna» (InCarico); salvare quello di nessuno lo prende in carico.
function ModuloRinnovo({ r, torna }: { r: NonNullable<Scheda['rinnovi']>[number]; torna: string }) {
  return (
    <form action={aggiornaRinnovo} className="fase-azioni">
      <input type="hidden" name="rinnovo" value={r.id} />
      <input type="hidden" name="torna" value={torna} />
      <div className="azioni-riga">
        <select name="esito" defaultValue={r.esito ?? ''} aria-label="Esito">
          <option value="">Ancora aperto</option>
          {Object.entries(ESITO_RINNOVO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input type="text" name="note" defaultValue={r.note ?? ''} placeholder="Note" aria-label="Note" />
        <BottoneInvio testo="Salva il rinnovo" inCorso="Salvataggio…" classe="piccolo" />
      </div>
    </form>
  )
}

function ModuloDisdetta({ d, torna }: { d: Scheda['disdette'][number]; torna: string }) {
  return (
    <form action={aggiornaDisdetta} className="fase-azioni">
      <input type="hidden" name="disdetta" value={d.id} />
      <input type="hidden" name="torna" value={torna} />
      <div className="azioni-riga">
        <select name="contatto" defaultValue={d.contatto ?? ''} aria-label="Contatto">
          <option value="">Contatto: non ancora</option>
          <option value="telefonata">Telefonata</option>
          <option value="appuntamento">Appuntamento</option>
        </select>
        <select name="esito" defaultValue={d.esito ?? ''} aria-label="Esito">
          <option value="">Da gestire</option>
          {Object.entries(ESITO_DISDETTA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div className="azioni-riga">
        <select name="motivo" defaultValue={d.motivo ?? ''} aria-label="Motivo">
          <option value="">Motivo: non ancora</option>
          {d.motivo && !MOTIVI_DISDETTA.includes(d.motivo) && <option value={d.motivo}>{d.motivo}</option>}
          {MOTIVI_DISDETTA.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <input type="text" name="note" defaultValue={d.note ?? ''} placeholder="Note" aria-label="Note" />
        <BottoneInvio testo="Salva la disdetta" inCorso="Salvataggio…" classe="piccolo" />
      </div>
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
