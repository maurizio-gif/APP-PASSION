import type { Disdetta, Io, Operatore } from '@/lib/crm'
import { ESITO_DISDETTA, formatoData, formatoEuro, traduci } from '@/lib/formato'
import { Contatti, Persona } from '@/components/Ui'
import { InCarico } from '@/components/InCarico'
import { assegnaDisdetta, rilasciaDisdetta } from '@/app/dashboard/azioni'

// La tabella delle disdette: nella sezione Disdette e nella home («Da gestire»).
export function TabellaDisdette({ disdette, io, staff, torna }: { disdette: Disdetta[]; io: Io; staff: Operatore[]; torna: string }) {
  return (
    <div className="tabella-scorre">
      <table className="schede-mobile tabella-colonne tabella-uniforme">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Contratto</th>
            <th>Data disdetta</th>
            <th>Motivo e note</th>
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
              <td>
                <div className="riga-dati">
                  <strong>{d.piano ?? '—'}</strong>
                  <span className="muto">{formatoEuro(d.canone)}</span>
                  <span className="muto">Firmato {formatoData(d.data_firma)} · fine {formatoData(d.data_fine)}</span>
                </div>
              </td>
              <td>
                <div className="riga-dati">
                  <span className="normale"><span className="prefisso-mobile">Disdetto il </span>{formatoData(d.data_disdetta)}</span>
                </div>
              </td>
              <td>
                <div className="riga-dati">
                  {d.motivo ? <span className="normale">{d.motivo}</span> : <span className="muto">–</span>}
                  {d.contatto && <span className="muto">{d.contatto === 'telefonata' ? 'Telefonata' : 'Appuntamento'}</span>}
                  {d.note && <span className="muto">{d.note}</span>}
                </div>
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
