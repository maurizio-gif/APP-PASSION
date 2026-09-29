import Link from 'next/link'
import type { Io, Lead, Operatore } from '@/lib/crm'
import { formatoData, formatoOra, nomeCompleto } from '@/lib/formato'
import { BollinoFase, BollinoFonte } from '@/components/Ui'
import { assegnaLead, prendiLead } from '@/app/dashboard/azioni'
import { puoGestireLead } from '@/lib/permessi'

// La tabella dei lead com'e' l'Interface di Airtable (Interface Commerciali ->
// Opportunita'): una riga per lead, con in fila da dove arriva, cosa cerca, le
// note dei task. Il resto e' nella scheda, dal nome. Sul telefono, al posto
// della tabella, un elenco di righe basse: nome e fonte, sotto quando e cosa
// cerca, l'azione a destra.
export function TabellaLead({ lead, io, staff, torna }: { lead: Lead[]; io: Io; staff: Operatore[]; torna: string }) {
  return (
    <>
      <div className="tabella-scorre solo-computer">
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
                  <td className="nowrap"><Azione l={l} io={io} staff={staff} torna={torna} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <ul className="lead-telefono solo-telefono">
        {lead.map((l) => {
          const dettaglio = [`${formatoData(l.creato_il)} ${formatoOra(l.creato_il)}`, l.attivita_interesse, l.note_task].filter(Boolean).join(' · ')
          return (
            <li key={l.id} className={assegna(l, io) ? 'con-modulo' : undefined}>
              <div className="lead-telefono-testa">
                <Link href={`/dashboard/persone/${l.utente_id}`}><strong>{nomeCompleto(l.nome, l.cognome)}</strong></Link>{' '}
                <BollinoFonte fonte={l.fonte} dettaglio={l.fonte_dettaglio} />
              </div>
              <div className="lead-telefono-dettaglio">{dettaglio}</div>
              <div className="lead-telefono-azione"><Azione l={l} io={io} staff={staff} torna={torna} /></div>
            </li>
          )
        })}
      </ul>
    </>
  )
}

// Si riassegna (tendina e bottone) un lead in gestione che si puo' gestire.
const assegna = (l: Lead, io: Io) => l.fase === 'in_gestione' && puoGestireLead(io, l.assegnato_a)

// Cosa si fa sul lead: prenderlo, riassegnarlo, o solo vederne lo stato.
function Azione({ l, io, staff, torna }: { l: Lead; io: Io; staff: Operatore[]; torna: string }) {
  if (l.fase === 'da_gestire') {
    return (
      <form action={prendiLead}>
        <input type="hidden" name="lead" value={l.id} />
        <input type="hidden" name="torna" value={torna} />
        <button className="bottone piccolo">Prendo in carico</button>
      </form>
    )
  }
  if (assegna(l, io)) {
    return (
      <form action={assegnaLead} className="azioni-riga">
        <input type="hidden" name="lead" value={l.id} />
        <input type="hidden" name="torna" value={torna} />
        <select name="staff" defaultValue={l.assegnato_a ?? ''} aria-label="Assegna a" className="piccola">
          {staff.map((s) => <option key={s.id} value={s.id}>{s.nome} {s.cognome ?? ''}</option>)}
        </select>
        <button className="bottone secondario piccolo">Assegna</button>
      </form>
    )
  }
  if (l.fase === 'in_gestione') return <span className="piccolo">{l.assegnato_nome}</span>
  return <BollinoFase fase={l.fase} esito={l.esito} />
}
