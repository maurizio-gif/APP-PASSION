import Link from 'next/link'
import type { Io, Lead, Operatore } from '@/lib/crm'
import { formatoData, formatoOra, nomeCompleto } from '@/lib/formato'
import { BollinoFase, BollinoFonte } from '@/components/Ui'
import { assegnaLead, prendiLead } from '@/app/dashboard/azioni'
import { puoGestireLead } from '@/lib/permessi'

// La tabella dei lead com'e' l'Interface di Airtable (Interface Commerciali ->
// Opportunita'): una riga per lead, con in fila da dove arriva, cosa cerca, le
// note dei task. Il resto e' nella scheda, dal nome.
export function TabellaLead({ lead, io, staff, torna }: { lead: Lead[]; io: Io; staff: Operatore[]; torna: string }) {
  return (
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
            <th></th>
          </tr>
        </thead>
        <tbody>
          {lead.map((l) => {
            const scheda = `/dashboard/persone/${l.utente_id}`
            const puo = puoGestireLead(io, l.assegnato_a)
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
                <td className="nowrap">
                  {l.fase === 'da_gestire' ? (
                    <form action={prendiLead}>
                      <input type="hidden" name="lead" value={l.id} />
                      <input type="hidden" name="torna" value={torna} />
                      <button className="bottone piccolo">Prendo in carico</button>
                    </form>
                  ) : l.fase === 'in_gestione' && puo ? (
                    <form action={assegnaLead} className="azioni-riga">
                      <input type="hidden" name="lead" value={l.id} />
                      <input type="hidden" name="torna" value={torna} />
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
  )
}
