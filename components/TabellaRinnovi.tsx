import { linkPgm, type Io, type Operatore, type Rinnovo } from '@/lib/crm'
import { ESITO_RINNOVO, formatoData, formatoEuro, STATO_CONTRATTO, traduci } from '@/lib/formato'
import { Contatti, Persona } from '@/components/Ui'
import { InCarico } from '@/components/InCarico'
import { assegnaRinnovo, rilasciaRinnovo } from '@/app/dashboard/azioni'

// La tabella dei rinnovi: nella sezione Rinnovi e nella home («Da gestire»).
export function TabellaRinnovi({ rinnovi, io, staff, torna }: { rinnovi: Rinnovo[]; io: Io; staff: Operatore[]; torna: string }) {
  return (
    <div className="tabella-scorre">
      <table className="schede-mobile tabella-colonne tabella-uniforme">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Abbonamento</th>
            <th>Data rinnovo</th>
            <th>Note</th>
            <th>In carico</th>
          </tr>
        </thead>
        <tbody>
          {rinnovi.map((r) => {
            const pgm = linkPgm(r.member_id)
            return (
              <tr key={r.id}>
                <td>
                  <div className="riga-dati">
                  <Persona id={r.utente_id} nome={r.nome} cognome={r.cognome} />
                  <Contatti telefono={r.telefono} email={r.email} />
                  {r.esito && (
                    <span className={`bollino ${r.esito === 'rinnovato' ? 'verde' : 'grigio'}`}>{traduci(ESITO_RINNOVO, r.esito)}</span>
                  )}
                  {r.gestito_il && <div className="piccolo attenuato">{r.assegnato_nome ?? '—'} · {formatoData(r.gestito_il)}</div>}
                  {pgm && <a className="piccolo" href={pgm} target="_blank" rel="noreferrer">PerfectGym ↗</a>}
                  </div>
                </td>
                <td>
                  <div className="riga-dati">
                    <strong>{r.piano ?? '—'}</strong>
                    <span className="muto">{formatoEuro(r.valore)}</span>
                      {r.stato_contratto && <span className="muto">{traduci(STATO_CONTRATTO, r.stato_contratto)}</span>}
                    {r.rinnovato_su_pgm && <span className="etichetta-riga"><span className="bollino verde">Nuovo abbonamento su PerfectGym</span></span>}
                  </div>
                </td>
                <td>
                  <div className="riga-dati">
                    <span className="normale"><span className="prefisso-mobile">Scade il </span>{formatoData(r.scadenza)}</span>
                  </div>
                </td>
                <td>
                  <div className="riga-dati">
                    {r.note ? <span className="normale">{r.note}</span> : <span className="muto">–</span>}
                    {r.task_aperti > 0 && <span className="muto">{r.task_aperti} {r.task_aperti === 1 ? 'task aperto' : 'task aperti'}</span>}
                  </div>
                </td>
                <td>
                  <InCarico id={r.id} assegnatoA={r.assegnato_a} assegnatoNome={r.assegnato_nome}
                    aperto={!r.esito} io={io} staff={staff} torna={torna}
                    assegna={assegnaRinnovo} rilascia={rilasciaRinnovo} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
