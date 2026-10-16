import type { Task } from '@/lib/crm'
import { formatoDataOra, formatoOra, TIPO_TASK, traduci } from '@/lib/formato'
import { Contatti, Persona, Provenienza } from '@/components/Ui'

// I task, in tabella come tutte le altre sezioni: persona, task, nota, azioni.
// Nella sezione Task (`compatta` spenta) ci sono anche telefono, data intera, chi lo
// segue (se non sono «i miei») e il campo «Com'è andata»; nella home («Da gestire»)
// la versione compatta: solo l'ora e i due bottoni.
export function TabellaTask({ task, chi = 'miei', torna, compatta = false, completa }: { task: Task[]; chi?: string; torna: string; compatta?: boolean; completa?: (f: FormData) => Promise<void> }) {
  return (
    <div className="tabella-scorre">
      <table className="schede-mobile tabella-colonne tabella-task">
        <thead>
          <tr>
            <th>Persona</th>
            <th>Task</th>
            <th>Nota</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {task.map((t) => {
            const scaduto = !t.completato_il && t.data && new Date(t.data) < new Date()
            return (
              <tr key={t.id}>
                <td>
                  <div className="riga-dati">
                    <Persona id={t.utente_id} nome={t.nome} cognome={t.cognome} nuovaScheda />
                    {!compatta && <Contatti telefono={t.telefono} email={null} />}
                  </div>
                </td>
                <td>
                  <div className="riga-dati">
                    <strong>{traduci(TIPO_TASK, t.tipo)}</strong>
                    <span className={scaduto ? 'stato rosso' : 'muto'}>{compatta ? formatoOra(t.data) : formatoDataOra(t.data)}</span>
                    {t.origine && <span className="etichetta-riga"><Provenienza origine={t.origine} /></span>}
                    {!compatta && chi !== 'miei' && <span className="muto">{t.assegnato_nome ?? 'nessuno'}</span>}
                  </div>
                </td>
                <td>
                  <div className="riga-dati">
                    {t.nota && <span className="normale">{t.nota}</span>}
                    {t.completato_il && (
                      <span className="muto">fatto {formatoDataOra(t.completato_il)}</span>
                    )}
                    {t.completato_il && t.esito && (
                      <span className="etichetta-riga"><span className={`bollino ${t.esito === 'positivo' ? 'verde' : 'rosso'}`}>{t.esito}</span></span>
                    )}
                  </div>
                </td>
                <td>
                  {!t.completato_il && (
                    <form action={completa} className="azioni-riga task-azioni">
                      <input type="hidden" name="task" value={t.id} />
                      <input type="hidden" name="torna" value={torna} />
                      {!compatta && <input type="text" name="nota" placeholder="Com'è andata" />}
                      <button className="bottone piccolo" name="esito" value="positivo">Fatto ✓</button>
                      <button className="bottone secondario piccolo" name="esito" value="negativo">{compatta ? 'Non risponde' : 'Negativo'}</button>
                    </form>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
