import Link from 'next/link'
import { crm } from '@/lib/crm'
import { formatoData, formatoDataOra, formatoFa, FONTE } from '@/lib/formato'
import { Avviso, BollinoFase, BollinoFonte, Contatti, Persona, Schede, Vuoto } from '@/components/Ui'
import { assegnaLead, prendiLead } from '../azioni'

const VISTE = [
  { chiave: 'da_gestire', testo: 'Da gestire' },
  { chiave: 'mie', testo: 'I miei' },
  { chiave: 'in_gestione', testo: 'In gestione' },
  { chiave: 'vinte', testo: 'Vinte' },
  { chiave: 'perse', testo: 'Perse' },
]

export default async function Lead({ searchParams }: { searchParams: { vista?: string; fonte?: string; q?: string; errore?: string } }) {
  const vista = VISTE.some((v) => v.chiave === searchParams.vista) ? searchParams.vista! : 'da_gestire'
  const fonte = searchParams.fonte && FONTE[searchParams.fonte] ? searchParams.fonte : null
  const q = searchParams.q?.slice(0, 80) || null
  const [lead, io, staff] = await Promise.all([crm.lead(vista, fonte, q), crm.io(), crm.staff()])
  const qui = `/dashboard/lead?vista=${vista}${fonte ? `&fonte=${fonte}` : ''}${q ? `&q=${encodeURIComponent(q)}` : ''}`
  const base = `/dashboard/lead?${fonte ? `fonte=${fonte}&` : ''}${q ? `q=${encodeURIComponent(q)}` : ''}`.replace(/[?&]$/, '')

  return (
    <>
      <div className="testata">
        <div>
          <h1>Lead</h1>
          <p>Chi arriva: si commenta finché non c&apos;è un contatto, poi lo si prende in carico e lo si chiude.</p>
        </div>
        <Link className="bottone" href="/dashboard/lead/nuovo">+ Nuovo lead</Link>
      </div>
      <Avviso errore={searchParams.errore} />

      <Schede voci={VISTE} attiva={vista} base={base} />

      <form className="filtri" action="/dashboard/lead">
        <input type="hidden" name="vista" value={vista} />
        <input type="search" name="q" defaultValue={q ?? ''} placeholder="Nome, cognome, telefono, email" />
        <select name="fonte" defaultValue={fonte ?? ''} aria-label="Fonte">
          <option value="">Tutte le fonti</option>
          {Object.entries(FONTE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="bottone secondario" type="submit">Filtra</button>
      </form>

      <div className="scheda">
        <p className="piccolo attenuato" style={{ marginTop: 0 }}>{lead.length === 200 ? 'I 200 più recenti' : `${lead.length} lead`}</p>
        {lead.length === 0 ? (
          <Vuoto>Nessun lead qui.</Vuoto>
        ) : (
          <div className="tabella-scorre">
            <table>
              <thead>
                <tr>
                  <th>Persona</th>
                  <th>Fonte</th>
                  <th>Stato</th>
                  <th>Ultimo commento</th>
                  <th>Prossimo task</th>
                  <th>Arrivato</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lead.map((l) => {
                  const puo = io?.ruolo === 'admin' || !l.assegnato_a || l.assegnato_a === io?.id
                  return (
                    <tr key={l.id}>
                      <td>
                        <Persona id={l.utente_id} nome={l.nome} cognome={l.cognome} />
                        <Contatti telefono={l.telefono} email={l.email} />
                        {l.attivita_interesse && <div className="piccolo attenuato">{l.attivita_interesse}</div>}
                      </td>
                      <td>
                        <BollinoFonte fonte={l.fonte} dettaglio={l.fonte_dettaglio} />
                        {l.presentato_da && <div className="piccolo attenuato">da {l.presentato_da}</div>}
                      </td>
                      <td>
                        <BollinoFase fase={l.fase} esito={l.esito} />
                        {l.assegnato_nome && <div className="piccolo">{l.assegnato_nome}</div>}
                      </td>
                      <td className="piccolo" style={{ maxWidth: 280 }}>
                        {l.ultimo_commento ? (
                          <>
                            <span className="riassunto">{l.ultimo_commento}</span>
                            <div className="attenuato">{formatoFa(l.ultimo_commento_il)} · {l.commenti} in tutto</div>
                          </>
                        ) : (
                          <span className="attenuato">—</span>
                        )}
                      </td>
                      <td className="piccolo nowrap">{l.prossimo_task ? formatoDataOra(l.prossimo_task) : '—'}</td>
                      <td className="piccolo nowrap">{formatoData(l.creato_il)}</td>
                      <td className="nowrap">
                        {l.fase === 'da_gestire' && (
                          <form action={prendiLead}>
                            <input type="hidden" name="lead" value={l.id} />
                            <input type="hidden" name="torna" value={qui} />
                            <button className="bottone piccolo">Prendo in carico</button>
                          </form>
                        )}
                        {l.fase === 'in_gestione' && puo && (
                          <form action={assegnaLead} className="azioni-riga">
                            <input type="hidden" name="lead" value={l.id} />
                            <input type="hidden" name="torna" value={qui} />
                            <select name="staff" defaultValue={l.assegnato_a ?? ''} aria-label="Assegna a">
                              {staff.map((s) => <option key={s.id} value={s.id}>{s.nome} {s.cognome ?? ''}</option>)}
                            </select>
                            <button className="bottone secondario piccolo">Assegna</button>
                          </form>
                        )}
                      </td>
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
