import type { Operatore, Pagamento, Prova } from '@/lib/crm'
import { Gestione } from '@/components/Ui'
import { RigaProva } from '@/components/RigaProva'
import { SceltaOperatore } from '@/components/SceltaOperatore'
import { aggiornaProva } from '@/app/dashboard/azioni'

// La tabella delle prove col modulo dell'esito: nella sezione Prove e nella
// home («Da gestire»).
export function TabellaProve({ prove, pagamenti, staff, torna }: { prove: Prova[]; pagamenti: Record<number, Pagamento>; staff: Operatore[]; torna: string }) {
  return (
    <div className="tabella-scorre">
      <table className="schede-mobile tabella-prove">
        <thead>
          <tr>
            <th>Persona</th>
            <th>Pass</th>
            <th>Come va</th>
            <th>Gestione</th>
          </tr>
        </thead>
        <tbody>
          {prove.map((p) => (
            <RigaProva key={p.id} p={p} pagamento={p.contract_id != null ? pagamenti[p.contract_id] : null}>
              <Gestione id={p.id}>
                <form action={aggiornaProva} className="modulo compatto gestione-prova">
                  <input type="hidden" name="prova" value={p.id} />
                  <input type="hidden" name="torna" value={torna} />
                  {/* Iscritto non si sceglie: resta solo se c'e' gia'. */}
                  <select name="esito" defaultValue={p.esito ?? ''} aria-label="Esito">
                    <option value="">Ancora aperta</option>
                    {p.esito === 'iscritto' && <option value="iscritto">Iscritto</option>}
                    <option value="non_iscritto">Non iscritto</option>
                  </select>
                  <SceltaOperatore staff={staff} attuale={p.gestito_da} attualeNome={p.gestito_nome} />
                  <button className="bottone piccolo">Salva</button>
                  <details className="gestione-extra" open={Boolean(p.obiezione || p.note)}>
                    <summary>Obiezione e note</summary>
                    <div className="gestione-extra-campi">
                      <input type="text" name="obiezione" defaultValue={p.obiezione ?? ''} placeholder="Obiezione" />
                      <input type="text" name="note" defaultValue={p.note ?? ''} placeholder="Note" />
                    </div>
                  </details>
                </form>
              </Gestione>
            </RigaProva>
          ))}
        </tbody>
      </table>
    </div>
  )
}
