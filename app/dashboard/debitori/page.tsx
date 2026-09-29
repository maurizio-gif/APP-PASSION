import Link from 'next/link'
import { crm, linkPgm, richiediSezione } from '@/lib/crm'
import { formatoData, formatoDataOra, formatoEuro, formatoFa, STATO_CONTRATTO, TIPI_TASK_NUOVI, traduci } from '@/lib/formato'
import { Avviso, Contatti, Persona, Vuoto } from '@/components/Ui'
import { FiltroConsulente, consulenteScelto } from '@/components/FiltroConsulente'
import { debitoAssegna, debitoTask } from '../azioni'

const VISTE = [
  { chiave: 'attivi', testo: 'Abbonamento attivo' },
  { chiave: 'scaduti', testo: 'Abbonamento scaduto' },
  { chiave: 'tutti', testo: 'Tutti' },
  { chiave: 'rientrati', testo: 'Rientrati' },
]
const CHI = [
  { chiave: 'tutti', testo: 'Di tutti' },
  { chiave: 'miei', testo: 'I miei' },
  { chiave: 'nessuno', testo: 'Da assegnare' },
]

// Chi ha il saldo negativo su PerfectGym. Il saldo e' quello del mirror, letto
// a ogni apertura: chi paga esce dall'elenco da solo e finisce in Rientrati.
// Il recupero si segue coi task, che restano anche nella scheda della persona.
export default async function Debitori({ searchParams }: { searchParams: { vista?: string; chi?: string; consulente?: string; errore?: string } }) {
  const io = await richiediSezione('debitori')
  const vista = VISTE.some((v) => v.chiave === searchParams.vista) ? searchParams.vista! : 'attivi'
  const staff = await crm.staff()
  // Il consulente: a chi e' assegnato il recupero (con lui, «di chi» e' «di tutti»).
  const consulente = consulenteScelto(staff, searchParams.consulente)
  const chi = consulente ? 'tutti' : CHI.some((v) => v.chiave === searchParams.chi) ? searchParams.chi! : 'tutti'
  const debitori = await crm.debitori(vista, chi, consulente)
  const perConsulente = consulente ? `&consulente=${consulente}` : ''
  const qui = `/dashboard/debitori?vista=${vista}&chi=${chi}${perConsulente}`
  const rientrati = vista === 'rientrati'
  const totale = debitori.reduce((s, d) => s + (d.saldo != null && d.saldo < 0 ? d.saldo : 0), 0)
  const controllato = debitori[0]?.saldo_controllato_il

  return (
    <>
      <div className="testata">
        <div>
          <h1>Debitori</h1>
          <p>Chi ha il saldo negativo su PerfectGym: si recupera coi task, e quando paga esce da solo.</p>
        </div>
      </div>
      <Avviso errore={searchParams.errore} />
      <div className="schede-vista">
        {VISTE.map((v) => (
          <Link key={v.chiave} href={`/dashboard/debitori?vista=${v.chiave}&chi=${chi}${perConsulente}`} className={v.chiave === vista ? 'attivo' : undefined}>{v.testo}</Link>
        ))}
      </div>
      <div className="schede-vista">
        {CHI.map((v) => (
          <Link key={v.chiave} href={`/dashboard/debitori?vista=${vista}&chi=${v.chiave}`} className={!consulente && v.chiave === chi ? 'attivo' : undefined}>{v.testo}</Link>
        ))}
      </div>
      <FiltroConsulente azione="/dashboard/debitori" staff={staff} consulente={consulente} tieni={{ vista, chi: 'tutti' }} />

      <div className="scheda">
        {debitori.length > 0 && (
          <p className="piccolo attenuato debitori-totale">
            {rientrati ? (
              <>{debitori.length} rientrati negli ultimi 90 giorni</>
            ) : (
              <>
                <strong className="negativo">{formatoEuro(totale)}</strong> da {debitori.length} {debitori.length === 1 ? 'socio' : 'soci'}
              </>
            )}
            {controllato && <> · saldi controllati su PerfectGym {formatoFa(controllato)}</>}
          </p>
        )}
        {debitori.length === 0 ? (
          <Vuoto>{rientrati ? 'Nessun debito rientrato negli ultimi 90 giorni.' : 'Nessun debitore qui.'}</Vuoto>
        ) : (
          <div className="tabella-scorre">
            <table>
              <thead>
                <tr>
                  <th>Socio</th>
                  <th>Saldo</th>
                  <th>Abbonamento</th>
                  <th>Recupero</th>
                  {!rientrati && <th>Nuovo task</th>}
                </tr>
              </thead>
              <tbody>
                {debitori.map((d) => {
                  const pgm = linkPgm(d.member_id)
                  return (
                    <tr key={d.debito_id ?? d.member_id}>
                      <td>
                        <Persona id={d.utente_id} nome={d.nome} cognome={d.cognome} />
                        <Contatti telefono={d.telefono} email={d.email} />
                        {pgm && <a className="piccolo" href={pgm} target="_blank" rel="noreferrer">PerfectGym ↗</a>}
                      </td>
                      <td className="nowrap">
                        <div className={d.saldo != null && d.saldo < 0 ? 'negativo' : undefined}>{formatoEuro(d.saldo)}</div>
                        {d.negativo_da && <div className="piccolo attenuato">in negativo dal {formatoData(d.negativo_da)}</div>}
                        <div className="piccolo attenuato">
                          {d.ultimo_pagamento ? `ultimo pagamento ${formatoData(d.ultimo_pagamento)} · ${formatoEuro(d.ultimo_importo)}` : 'nessun pagamento'}
                        </div>
                        {d.rientrato_il && <span className="bollino verde">Rientrato il {formatoData(d.rientrato_il)}</span>}
                      </td>
                      <td className="piccolo">
                        <span className={`bollino ${d.abbonamento_attivo ? 'verde' : 'grigio'}`}>{d.abbonamento_attivo ? 'Attivo' : 'Scaduto'}</span>
                        <div><strong>{d.piano ?? 'nessun abbonamento'}</strong></div>
                        {d.stato_contratto && (
                          <div className="attenuato">
                            {traduci(STATO_CONTRATTO, d.stato_contratto)}
                            {d.data_fine ? ` · fine ${formatoData(d.data_fine)}` : ''}
                          </div>
                        )}
                      </td>
                      <td>
                        {rientrati ? (
                          <span className="piccolo">{d.assegnato_nome ?? '—'}</span>
                        ) : (
                          <form action={debitoAssegna} className="azioni-riga">
                            <input type="hidden" name="socio" value={d.member_id} />
                            <input type="hidden" name="torna" value={qui} />
                            {d.assegnato_a ? (
                              <>
                                <select name="staff" defaultValue={d.assegnato_a} aria-label="Chi segue il recupero" className="piccola">
                                  {staff.map((s) => <option key={s.id} value={s.id}>{s.nome} {s.cognome ?? ''}</option>)}
                                </select>
                                <button className="bottone secondario piccolo">Assegna</button>
                              </>
                            ) : (
                              <button className="bottone piccolo">Prendo in carico</button>
                            )}
                          </form>
                        )}
                        <div className="piccolo debitori-task">
                          {d.task_aperti > 0 ? (
                            <span className={`bollino${d.prossimo_task && new Date(d.prossimo_task) < new Date() ? ' rosso' : ''}`}>
                              {d.task_aperti} {d.task_aperti === 1 ? 'task aperto' : 'task aperti'} · {formatoDataOra(d.prossimo_task)}
                            </span>
                          ) : (
                            <span className="attenuato">nessun task aperto</span>
                          )}
                          {d.note_task && <span className="taglia larga" title={d.note_task}>{d.note_task}</span>}
                        </div>
                      </td>
                      {!rientrati && (
                        <td>
                          <details className="debitori-nuovo">
                            <summary className="bottone secondario piccolo">+ Task</summary>
                            <form action={debitoTask} className="modulo compatto">
                              <input type="hidden" name="socio" value={d.member_id} />
                              <input type="hidden" name="torna" value={qui} />
                              <div className="azioni-riga">
                                <select name="tipo" defaultValue="telefonata" aria-label="Task">
                                  {TIPI_TASK_NUOVI.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </select>
                                <select name="assegnato" defaultValue={d.assegnato_a ?? io?.id ?? ''} aria-label="A chi">
                                  {staff.map((s) => <option key={s.id} value={s.id}>{s.nome} {s.cognome ?? ''}</option>)}
                                </select>
                              </div>
                              <input type="datetime-local" name="data" required aria-label="Quando" />
                              <input type="text" name="nota" placeholder="Cosa fare (es. sollecito, piano di rientro)" />
                              <button className="bottone piccolo">Aggiungi task</button>
                            </form>
                          </details>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
