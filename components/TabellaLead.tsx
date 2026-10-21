import Link from 'next/link'
import type { ContrattoLead, Io, Lead, Operatore } from '@/lib/crm'
import { formatoData, formatoOra, nomeCompleto } from '@/lib/formato'
import { BollinoFase, BollinoFonte, Contatti } from '@/components/Ui'
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
        <table className={`tabella-lead tabella-colonne${contratti ? '' : ' tabella-uniforme'}`}>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>{firma ? 'Data firma' : 'Data di creazione'}</th>
              {contratti ? (
                <>
                  <th>Abbonamento</th>
                  <th>Inizio</th>
                  <th>Consulente</th>
                </>
              ) : (
                <>
                  <th>Attività di interesse</th>
                  <th>Nota</th>
                </>
              )}
              <th>{contratti ? '' : 'In carico'}</th>
            </tr>
          </thead>
          <tbody>
            {lead.map((l) => {
              const scheda = `/dashboard/persone/${l.utente_id}`
              const c = contratti?.[l.id]
              return (
                <tr key={l.id}>
                  <td>
                    <div className="riga-dati">
                      <NomeScheda href={scheda} l={l} />
                      <Contatti telefono={l.telefono} email={l.email} />
                    </div>
                  </td>
                  <td>
                    <div className="riga-dati">
                      <Link href={scheda} target="_blank" rel="noopener noreferrer" className="normale">{firma ? (c?.data_firma ? formatoData(c.data_firma) : '–') : formatoData(l.creato_il)}</Link>
                      {!firma && <span className="muto">{formatoOra(l.creato_il)}</span>}
                    </div>
                  </td>
                  {contratti ? (
                    <>
                      <td><div className="riga-dati"><strong>{c?.piano || '–'}</strong></div></td>
                      <td><div className="riga-dati"><span className="normale">{c?.data_inizio ? formatoData(c.data_inizio) : '–'}</span></div></td>
                      <td><div className="riga-dati">{l.assegnato_nome ? <span className="normale">{l.assegnato_nome}</span> : <span className="muto">nessuno</span>}</div></td>
                    </>
                  ) : (
                    <>
                      <td><div className="riga-dati"><span className="normale">{l.attivita_interesse || '–'}</span></div></td>
                      <td><div className="riga-dati">{l.note_task ? <span className="normale">{l.note_task}</span> : <span className="muto">–</span>}</div></td>
                    </>
                  )}
                  <td><Azione l={l} io={io} staff={staff} torna={torna} /></td>
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
      <div className="azioni-gruppo">
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
          <button className="bottone secondario piccolo icona" title="Rimetti da assegnare: torna fra i lead da gestire, senza nessuno" aria-label="Rimetti da assegnare"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3" /></svg></button>
        </form>
      </div>
    )
  }
  if (l.fase === 'in_gestione') return <span className="piccolo">{l.assegnato_nome}</span>
  return <BollinoFase fase={l.fase} esito={l.esito} />
}
