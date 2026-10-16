import type { Disdetta, Io, Operatore } from '@/lib/crm'
import { ESITO_DISDETTA, formatoData, formatoEuro, traduci } from '@/lib/formato'
import { Contatti, Persona } from '@/components/Ui'
import { InCarico } from '@/components/InCarico'
import { assegnaDisdetta, rilasciaDisdetta } from '@/app/dashboard/azioni'

// La tabella delle disdette: nella sezione Disdette e nella home («Da gestire»).
export function TabellaDisdette({ disdette, io, staff, torna }: { disdette: Disdetta[]; io: Io; staff: Operatore[]; torna: string }) {
  return (
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
                <div className="riga-dati">
                <Persona id={d.utente_id} nome={d.nome} cognome={d.cognome} />
                <Contatti telefono={d.telefono} email={d.email} />
                {d.esito && (
                  <span className={`bollino ${d.esito === 'vinto' ? 'verde' : d.esito === 'perso' ? 'grigio' : 'giallo'}`}>
                    {traduci(ESITO_DISDETTA, d.esito)}
                  </span>
                )}
                {d.gestito_il && <div className="piccolo attenuato">{d.gestito_nome ?? '—'} · {formatoData(d.gestito_il)}</div>}
                </div>
              </td>
              <td className="piccolo info">
                <div><strong>{d.piano ?? '—'}</strong> · {formatoEuro(d.canone)}</div>
                <div className="attenuato">firmato {formatoData(d.data_firma)} · fine {formatoData(d.data_fine)}</div>
                <div>disdetto il <strong>{formatoData(d.data_disdetta)}</strong></div>
              </td>
              <td className="nowrap">
                <InCarico id={d.id} assegnatoA={d.gestito_da} assegnatoNome={d.gestito_nome}
                  aperto={!d.esito || d.esito === 'standby'} io={io} staff={staff} torna={torna}
                  assegna={assegnaDisdetta} rilascia={rilasciaDisdetta} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
