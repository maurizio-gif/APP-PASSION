import Link from 'next/link'
import type { ContrattoLead, Io, Lead, Operatore } from '@/lib/crm'
import { formatoData, formatoOra, nomeCompleto } from '@/lib/formato'
import { BollinoFase, BollinoFonte } from '@/components/Ui'
import { assegnaLead, prendiLead, rilasciaLead } from '@/app/dashboard/azioni'
import { puoGestire } from '@/lib/permessi'

// La tabella dei lead com'e' l'Interface di Airtable (Interface Commerciali ->
// Opportunita'): una riga per lead, con in fila da dove arriva, cosa cerca, le
// note dei task. Il resto e' nella scheda, dal nome. Sul telefono, al posto
// della tabella, un elenco di righe basse: nome e fonte, sotto quando e cosa
// cerca, l'azione a destra.
//
// Nelle schede Prove in corso, Prove scadute e Vinte (`contratti` presente) al
// posto di attivita' e note ci sono il nome del contratto, l'inizio e il
// consulente.
// Il nome apre la scheda in una nuova tab; la freccia in alto a destra lo dice.
function NomeScheda({ href, l }: { href: string; l: Lead }) {
  return (
    <Link href={href} target="_blank" rel="noopener noreferrer" title="Apre la scheda in una nuova tab">
      <strong>{nomeCompleto(l.nome, l.cognome)}</strong>
      <sup aria-hidden="true" className="attenuato"> ↗</sup>
    </Link>
  )
}

export function TabellaLead({ lead, io, staff, torna, contratti, firma }: { lead: Lead[]; io: Io; staff: Operatore[]; torna: string; contratti?: Record<string, ContrattoLead> | null; firma?: boolean }) {
  return (
    <>
      <div className="tabella-scorre solo-computer">
        <table className="tabella-lead">
          <thead>
            <tr>
              <th>{firma ? 'Data firma' : 'Data di creazione'}</th>
              <th></th>
              <th>Nome + Cognome</th>
              <th>Tipologia</th>
              {contratti ? (
                <>
                  <th>Abbonamento</th>
                  <th>Inizio</th>
                  <th>Consulente</th>
                </>
              ) : (
                <>
                  <th>Attività di interesse</th>
                  <th>Nota task</th>
                </>
              )}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lead.map((l) => {
              const scheda = `/dashboard/persone/${l.utente_id}`
              return (
                <tr key={l.id}>
                  <td className="nowrap"><Link href={scheda} target="_blank" rel="noopener noreferrer" className="muto">{firma ? (contratti?.[l.id]?.data_firma ? formatoData(contratti[l.id].data_firma) : '–') : formatoData(l.creato_il)}</Link></td>
                  <td className="nowrap attenuato">{firma ? '' : formatoOra(l.creato_il)}</td>
                  <td className="nowrap">
                    <NomeScheda href={scheda} l={l} />
                  </td>
                  <td className="nowrap"><BollinoFonte fonte={l.fonte} dettaglio={l.fonte_dettaglio} /></td>
                  {contratti ? (
                    <>
                      <td><span className="taglia" title={contratti[l.id]?.piano ?? undefined}>{contratti[l.id]?.piano || '–'}</span></td>
                      <td className="nowrap">{contratti[l.id]?.data_inizio ? formatoData(contratti[l.id].data_inizio) : '–'}</td>
                      <td className="nowrap">{l.assegnato_nome || <span className="attenuato">nessuno</span>}</td>
                    </>
                  ) : (
                    <>
                      <td><span className="taglia" title={l.attivita_interesse ?? undefined}>{l.attivita_interesse || '–'}</span></td>
                      <td><span className="taglia" title={l.note_task ?? undefined}>{l.note_task || ''}</span></td>
                    </>
                  )}
                  <td className="nowrap"><Azione l={l} io={io} staff={staff} torna={torna} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <ul className="lead-telefono solo-telefono">
        {lead.map((l) => {
          const c = contratti?.[l.id]
          const dettaglio = (contratti
            ? [firma ? (c?.data_firma ? `firmato il ${formatoData(c.data_firma)}` : null) : `${formatoData(l.creato_il)} ${formatoOra(l.creato_il)}`, c?.piano, c?.data_inizio ? `dal ${formatoData(c.data_inizio)}` : null, l.assegnato_nome]
            : [`${formatoData(l.creato_il)} ${formatoOra(l.creato_il)}`, l.attivita_interesse, l.note_task]
          ).filter(Boolean).join(' · ')
          return (
            <li key={l.id} className={assegna(l, io) ? 'con-modulo' : undefined}>
              <div className="lead-telefono-testa">
                <NomeScheda href={`/dashboard/persone/${l.utente_id}`} l={l} />{' '}
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

// Si riassegna (tendina e bottone) o si rimette da assegnare un lead in gestione che si puo' gestire.
const assegna = (l: Lead, io: Io) => l.fase === 'in_gestione' && puoGestire(io, l.assegnato_a)

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
      <div className="azioni-riga">
        <form action={assegnaLead} className="azioni-riga">
          <input type="hidden" name="lead" value={l.id} />
          <input type="hidden" name="torna" value={torna} />
          <select name="staff" defaultValue={l.assegnato_a ?? ''} aria-label="Assegna a" className="piccola">
            {staff.map((s) => <option key={s.id} value={s.id}>{s.nome} {s.cognome ?? ''}</option>)}
          </select>
          <button className="bottone secondario piccolo">Assegna</button>
        </form>
        <form action={rilasciaLead}>
          <input type="hidden" name="lead" value={l.id} />
          <input type="hidden" name="torna" value={torna} />
          <button className="bottone secondario piccolo" title="Torna fra i lead da gestire, senza nessuno">Rimetti da assegnare</button>
        </form>
      </div>
    )
  }
  if (l.fase === 'in_gestione') return <span className="piccolo">{l.assegnato_nome}</span>
  return <BollinoFase fase={l.fase} esito={l.esito} />
}
