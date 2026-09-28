import Link from 'next/link'
import { crm } from '@/lib/crm'
import { formatoData, formatoOra, FONTE, nomeCompleto } from '@/lib/formato'
import { Avviso, BollinoFase, BollinoFonte, Schede, Vuoto } from '@/components/Ui'
import { assegnaLead, prendiLead } from '../azioni'

const VISTE = [
  { chiave: 'da_gestire', testo: 'Da gestire' },
  { chiave: 'in_gestione', testo: 'In gestione' },
  { chiave: 'mie', testo: 'I miei' },
  { chiave: 'vinte', testo: 'Vinte' },
  { chiave: 'perse', testo: 'Perse' },
  { chiave: 'tutte', testo: 'Tutti' },
]

// La tabella e' quella a cui lo staff e' abituato su Airtable (Interface
// Commerciali -> Opportunita'): una riga per lead, e a colpo d'occhio da dove
// arriva, cosa cerca, le note dei task e l'ultimo commento. Il resto e' nella
// scheda, che si apre dal nome.
export default async function Lead({ searchParams }: { searchParams: { vista?: string; fonte?: string; q?: string; errore?: string } }) {
  const vista = VISTE.some((v) => v.chiave === searchParams.vista) ? searchParams.vista! : 'da_gestire'
  const fonte = searchParams.fonte && FONTE[searchParams.fonte] ? searchParams.fonte : null
  const q = searchParams.q?.slice(0, 80) || null
  const [lead, io, staff] = await Promise.all([crm.lead(vista, fonte, q), crm.io(), crm.staff()])
  const qui = `/dashboard/lead?vista=${vista}${fonte ? `&fonte=${fonte}` : ''}${q ? `&q=${encodeURIComponent(q)}` : ''}`
  const base = `/dashboard/lead?${fonte ? `fonte=${fonte}&` : ''}${q ? `q=${encodeURIComponent(q)}` : ''}`.replace(/[?&]$/, '')
  const aperti = vista === 'da_gestire' || vista === 'in_gestione' || vista === 'mie'

  return (
    <>
      <div className="testata">
        <div>
          <h1>Lead</h1>
          <p>Si commenta finché non c&apos;è un contatto, poi lo si prende in carico e lo si chiude.</p>
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
        {lead.length === 0 ? (
          <Vuoto>Nessun lead qui.</Vuoto>
        ) : (
          <div className="tabella-scorre">
            <table className="tabella-lead">
              <thead>
                <tr>
                  <th>Data di creazione</th>
                  <th></th>
                  <th>Nome + Cognome</th>
                  <th>Tipologia</th>
                  <th>Attività di interesse</th>
                  <th>Nota task</th>
                  <th>Commenti</th>
                  <th>{aperti ? '' : 'Stato'}</th>
                </tr>
              </thead>
              <tbody>
                {lead.map((l) => {
                  const scheda = `/dashboard/persone/${l.utente_id}`
                  const puo = io?.ruolo === 'admin' || !l.assegnato_a || l.assegnato_a === io?.id
                  return (
                    <tr key={l.id}>
                      <td className="nowrap"><Link href={scheda} className="muto">{formatoData(l.creato_il)}</Link></td>
                      <td className="nowrap attenuato">{formatoOra(l.creato_il)}</td>
                      <td className="nowrap">
                        <Link href={scheda}><strong>{nomeCompleto(l.nome, l.cognome)}</strong></Link>
                      </td>
                      <td className="nowrap"><BollinoFonte fonte={l.fonte} dettaglio={l.fonte_dettaglio} /></td>
                      <td><span className="taglia" title={l.attivita_interesse ?? undefined}>{l.attivita_interesse || '–'}</span></td>
                      <td><span className="taglia" title={l.note_task ?? undefined}>{l.note_task || ''}</span></td>
                      <td>
                        <span className="taglia larga" title={l.ultimo_commento ?? undefined}>{l.ultimo_commento || '–'}</span>
                        {l.commenti > 1 && <span className="piccolo attenuato"> ({l.commenti})</span>}
                      </td>
                      <td className="nowrap">
                        {l.fase === 'da_gestire' ? (
                          <form action={prendiLead}>
                            <input type="hidden" name="lead" value={l.id} />
                            <input type="hidden" name="torna" value={qui} />
                            <button className="bottone piccolo">Prendo in carico</button>
                          </form>
                        ) : l.fase === 'in_gestione' && puo ? (
                          <form action={assegnaLead} className="azioni-riga">
                            <input type="hidden" name="lead" value={l.id} />
                            <input type="hidden" name="torna" value={qui} />
                            <select name="staff" defaultValue={l.assegnato_a ?? ''} aria-label="Assegna a" className="piccola">
                              {staff.map((s) => <option key={s.id} value={s.id}>{s.nome} {s.cognome ?? ''}</option>)}
                            </select>
                            <button className="bottone secondario piccolo">Assegna</button>
                          </form>
                        ) : l.fase === 'in_gestione' ? (
                          <span className="piccolo">{l.assegnato_nome}</span>
                        ) : (
                          <BollinoFase fase={l.fase} esito={l.esito} />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="piccolo attenuato conteggio">{lead.length === 200 ? 'I 200 più recenti' : `${lead.length} lead`}</p>
      </div>
    </>
  )
}
