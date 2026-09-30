import Link from 'next/link'
import type { StatoTicket, TicketRiga, TipoTicket } from '@/lib/crm'
import { formatoData, formatoFa, STATO_TICKET, TIPO_TICKET, traduci } from '@/lib/formato'
import { Persona } from '@/components/Ui'

// I pezzi dei ticket che tornano nella sezione Ticket e nella scheda persona.

const COLORE_STATO: Record<StatoTicket, string> = {
  da_verificare: 'rosso', inviato: 'giallo', in_lavorazione: 'giallo', in_attesa: 'rosso',
  risolto: 'verde', risolto_desk: 'verde', doppione: 'grigio',
  da_confermare: 'rosso', confermata: 'giallo', rilasciata: 'verde', annullata: 'grigio',
}

export function BollinoStato({ stato }: { stato: StatoTicket }) {
  return <span className={`bollino ${COLORE_STATO[stato]}`}>{traduci(STATO_TICKET, stato)}</span>
}

export function BollinoTipo({ tipo }: { tipo: TipoTicket }) {
  return <span className={`bollino tipo-ticket tipo-${tipo}`}>{traduci(TIPO_TICKET, tipo)}</span>
}

export function NumeroTicket({ id }: { id: number }) {
  return <span className="numero-ticket">#{id}</span>
}

// `socio`: la colonna del socio (non serve nella scheda della persona).
export function TabellaTicket({ ticket, socio = true }: { ticket: TicketRiga[]; socio?: boolean }) {
  return (
    <div className="tabella-scorre">
      <table className="schede-mobile">
        <thead>
          <tr>
            <th>Ticket</th>
            {socio && <th>Socio</th>}
            <th>Aperto</th>
            <th>Ultimo movimento</th>
          </tr>
        </thead>
        <tbody>
          {ticket.map((t) => (
            <tr key={t.id}>
              <td>
                <Link href={`/dashboard/ticket/${t.id}`} className="ticket-titolo">
                  <NumeroTicket id={t.id} /> <strong>{t.titolo}</strong>
                </Link>
                <div className="ticket-bollini">
                  <BollinoTipo tipo={t.tipo} /> <BollinoStato stato={t.stato} />
                  {t.bloccante && <span className="bollino rosso">Blocca il lavoro</span>}
                  {t.doppione_di && <span className="piccolo attenuato"> nel #{t.doppione_di}</span>}
                </div>
              </td>
              {socio && (
                <td>
                  {t.utente_id ? <Persona id={t.utente_id} nome={t.nome} cognome={t.cognome} /> : <span className="attenuato">—</span>}
                </td>
              )}
              <td className="piccolo">
                <div>{t.aperto_da_nome ?? '—'}</div>
                <div className="attenuato">{formatoData(t.aperto_il)}</div>
                {t.tipo === 'modifica' && t.dal && <div>dal <strong>{formatoData(t.dal)}</strong></div>}
              </td>
              <td className="piccolo">
                <div>{formatoFa(t.aggiornato_il)}</div>
                <div className="attenuato">
                  {t.messaggi} {t.messaggi === 1 ? 'messaggio' : 'messaggi'}
                  {t.allegati > 0 && ` · ${t.allegati} ${t.allegati === 1 ? 'allegato' : 'allegati'}`}
                  {t.preso_nome && ` · ${t.preso_nome}`}
                </div>
                {t.ultimo_lato === 'r2d' && t.stato === 'in_attesa' && <div className="testo-rosso">R2D aspetta una risposta</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
