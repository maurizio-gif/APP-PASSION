import { linkPgm, type Io, type Operatore, type Rinnovo } from '@/lib/crm'
import { ESITO_RINNOVO, formatoData, formatoEuro, STATO_CONTRATTO, traduci } from '@/lib/formato'
import { Contatti, Persona } from '@/components/Ui'
import { InCarico } from '@/components/InCarico'
import { Iniziali } from '@/components/RigaProva'
import { assegnaRinnovo, rilasciaRinnovo } from '@/app/dashboard/azioni'

// La tabella dei rinnovi: nella sezione Rinnovi e nella home («Da gestire»).
export function TabellaRinnovi({ rinnovi, io, staff, torna }: { rinnovi: Rinnovo[]; io: Io; staff: Operatore[]; torna: string }) {
  return (
    <div className="tabella-scorre">
      <table className="schede-mobile">
        <thead>
          <tr>
            <th>Socio</th>
            <th>Abbonamento</th>
            <th>In carico</th>
          </tr>
        </thead>
        <tbody>
          {rinnovi.map((r) => {
            const pgm = linkPgm(r.member_id)
            return (
              <tr key={r.id}>
                <td>
                  <div className="cella-persona"><Iniziali nome={r.nome} cognome={r.cognome} /><div>
                  <Persona id={r.utente_id} nome={r.nome} cognome={r.cognome} />
                  <Contatti telefono={r.telefono} email={r.email} />
                  {r.esito && (
                    <span className={`bollino ${r.esito === 'rinnovato' ? 'verde' : 'grigio'}`}>{traduci(ESITO_RINNOVO, r.esito)}</span>
                  )}
                  {r.gestito_il && <div className="piccolo attenuato">{r.assegnato_nome ?? '—'} · {formatoData(r.gestito_il)}</div>}
                  {pgm && <a className="piccolo" href={pgm} target="_blank" rel="noreferrer">PerfectGym ↗</a>}
                  </div></div>
                </td>
                <td className="piccolo info">
                  <div><strong>{r.piano ?? '—'}</strong> · {formatoEuro(r.valore)}</div>
                  <div>scade il <strong>{formatoData(r.scadenza)}</strong></div>
                  {r.stato_contratto && <div className="attenuato">{traduci(STATO_CONTRATTO, r.stato_contratto)}</div>}
                  {r.rinnovato_su_pgm && <span className="bollino verde">Nuovo abbonamento su PerfectGym</span>}
                  {r.task_aperti > 0 && <div className="attenuato">{r.task_aperti} {r.task_aperti === 1 ? 'task aperto' : 'task aperti'}</div>}
                </td>
                <td className="nowrap">
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
