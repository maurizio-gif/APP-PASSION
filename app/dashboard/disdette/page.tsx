import { crm, richiediSezione } from '@/lib/crm'
import { ESITO_DISDETTA, formatoData, formatoEuro, traduci } from '@/lib/formato'
import { Avviso, Contatti, LinkGuida, Persona, Schede, Vuoto } from '@/components/Ui'
import { FiltroConsulente, consulenteScelto } from '@/components/FiltroConsulente'
import { InCarico } from '@/components/InCarico'
import { assegnaDisdetta, rilasciaDisdetta } from '../azioni'

const VISTE = [
  { chiave: 'da_gestire', testo: 'Da gestire' },
  { chiave: 'in_gestione', testo: 'In gestione' },
  { chiave: 'mie', testo: 'Le mie' },
  { chiave: 'gestite', testo: 'Gestite' },
  { chiave: 'tutte', testo: 'Tutte' },
]

// Le disdette: quando su PerfectGym compare la data di disdetta di un
// contratto, arriva qui. Si prende in carico come un lead e si chiama il socio
// per provare a recuperarlo; l'esito si scrive nella sua scheda.
export default async function Disdette({ searchParams }: { searchParams: { vista?: string; consulente?: string; errore?: string } }) {
  const io = await richiediSezione('disdette')
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
          <p>Chi ha disdetto su PerfectGym: si prende in carico, poi una telefonata o un appuntamento per capire il motivo e recuperarlo. L&apos;esito si scrive nella scheda.{' '}<LinkGuida argomento="disdette" /></p>
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
                  <th>In carico</th>
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
                      {d.gestito_il && <div className="piccolo attenuato">{d.gestito_nome ?? '—'} · {formatoData(d.gestito_il)}</div>}
                    </td>
                    <td className="piccolo info">
                      <div><strong>{d.piano ?? '—'}</strong> · {formatoEuro(d.canone)}</div>
                      <div className="attenuato">firmato {formatoData(d.data_firma)} · fine {formatoData(d.data_fine)}</div>
                      <div>disdetto il <strong>{formatoData(d.data_disdetta)}</strong></div>
                    </td>
                    <td className="nowrap">
                      <InCarico id={d.id} assegnatoA={d.gestito_da} assegnatoNome={d.gestito_nome}
                        aperto={!d.esito || d.esito === 'standby'} io={io} staff={staff} torna={qui}
                        assegna={assegnaDisdetta} rilascia={rilasciaDisdetta} />
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
