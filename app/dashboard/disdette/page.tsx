import { crm, richiediSezione } from '@/lib/crm'
import { ESITO_DISDETTA, formatoData, formatoEuro, MOTIVI_DISDETTA, traduci } from '@/lib/formato'
import { Avviso, Contatti, Gestione, LinkGuida, Persona, Schede, Vuoto } from '@/components/Ui'
import { FiltroConsulente, consulenteScelto } from '@/components/FiltroConsulente'
import { SceltaOperatore } from '@/components/SceltaOperatore'
import { aggiornaDisdetta } from '../azioni'

const VISTE = [
  { chiave: 'da_gestire', testo: 'Da gestire' },
  { chiave: 'gestite', testo: 'Gestite' },
  { chiave: 'tutte', testo: 'Tutte' },
]

// Le disdette: quando su PerfectGym compare la data di disdetta di un
// contratto, arriva qui. Si chiama il socio per provare a recuperarlo.
export default async function Disdette({ searchParams }: { searchParams: { vista?: string; consulente?: string; errore?: string } }) {
  await richiediSezione('disdette')
  const vista = VISTE.some((v) => v.chiave === searchParams.vista) ? searchParams.vista! : 'da_gestire'
  const staff = await crm.staff()
  // Il consulente: chi segue la disdetta.
  const consulente = consulenteScelto(staff, searchParams.consulente)
  const disdette = await crm.disdette(vista, consulente)
  const perConsulente = consulente ? `consulente=${consulente}` : ''
  const qui = `/dashboard/disdette?vista=${vista}${perConsulente ? `&${perConsulente}` : ''}`

  return (
    <>
      <div className="testata">
        <div>
          <h1>Disdette</h1>
          <p>Chi ha disdetto su PerfectGym: una telefonata o un appuntamento per capire il motivo e recuperarlo.{' '}<LinkGuida argomento="disdette" /></p>
        </div>
      </div>
      <Avviso errore={searchParams.errore} />
      <Schede voci={VISTE} attiva={vista} base={`/dashboard/disdette${perConsulente ? `?${perConsulente}` : ''}`} />
      <FiltroConsulente azione="/dashboard/disdette" staff={staff} consulente={consulente} tieni={{ vista }} />

      <div className="scheda">
        {disdette.length === 0 ? (
          <Vuoto>Nessuna disdetta qui.</Vuoto>
        ) : (
          <div className="tabella-scorre">
            <table className="schede-mobile">
              <thead>
                <tr>
                  <th>Socio</th>
                  <th>Contratto</th>
                  <th>Gestione</th>
                </tr>
              </thead>
              <tbody>
                {disdette.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <Persona id={d.utente_id} nome={d.nome} cognome={d.cognome} />
                      <Contatti telefono={d.telefono} email={d.email} />
                      {d.esito && (
                        <span className={`bollino ${d.esito === 'vinto' ? 'verde' : d.esito === 'perso' ? 'grigio' : 'giallo'}`}>
                          {traduci(ESITO_DISDETTA, d.esito)}
                        </span>
                      )}
                      {d.gestito_nome && <div className="piccolo attenuato">{d.gestito_nome} · {formatoData(d.gestito_il)}</div>}
                    </td>
                    <td className="piccolo info">
                      <div><strong>{d.piano ?? '—'}</strong> · {formatoEuro(d.canone)}</div>
                      <div className="attenuato">firmato {formatoData(d.data_firma)} · fine {formatoData(d.data_fine)}</div>
                      <div>disdetto il <strong>{formatoData(d.data_disdetta)}</strong></div>
                    </td>
                    <td className="gestisci">
                      <Gestione id={d.id}>
                        <form action={aggiornaDisdetta} className="modulo compatto">
                          <input type="hidden" name="disdetta" value={d.id} />
                          <input type="hidden" name="torna" value={qui} />
                          <div className="azioni-riga">
                            <select name="contatto" defaultValue={d.contatto ?? ''} aria-label="Contatto">
                              <option value="">Contatto…</option>
                              <option value="telefonata">Telefonata</option>
                              <option value="appuntamento">Appuntamento</option>
                            </select>
                            <select name="esito" defaultValue={d.esito ?? ''} aria-label="Esito">
                              <option value="">Esito…</option>
                              {Object.entries(ESITO_DISDETTA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                          </div>
                          <select name="motivo" defaultValue={d.motivo ?? ''} aria-label="Motivo">
                            <option value="">Motivo…</option>
                            {d.motivo && !MOTIVI_DISDETTA.includes(d.motivo) && <option value={d.motivo}>{d.motivo}</option>}
                            {MOTIVI_DISDETTA.map((m) => <option key={m} value={m}>{m}</option>)}
                          </select>
                          <input type="text" name="note" defaultValue={d.note ?? ''} placeholder="Note" />
                          <SceltaOperatore staff={staff} attuale={d.gestito_da} attualeNome={d.gestito_nome} />
                          <button className="bottone piccolo">Salva</button>
                        </form>
                      </Gestione>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
