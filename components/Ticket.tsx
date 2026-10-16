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
      <table className={`schede-mobile tabella-colonne tabella-ticket${socio ? ' con-cliente' : ''}`}>
        <thead>
          <tr>
            <th>Ticket</th>
            {socio && <th>Cliente</th>}
            <th>Aperto da</th>
            <th>Ultimo movimento</th>
          </tr>
        </thead>
        <tbody>
          {ticket.map((t) => (
            <tr key={t.id}>
              <td>
                <div className="riga-dati">
                  <Link href={`/dashboard/ticket/${t.id}`} className="ticket-titolo">
                    <NumeroTicket id={t.id} /> <strong>{t.titolo}</strong>
                  </Link>
                  <div className="ticket-bollini">
                    <BollinoTipo tipo={t.tipo} /> <BollinoStato stato={t.stato} />
                    {t.bloccante && <span className="bollino rosso">Blocca il lavoro</span>}
                    {t.doppione_di && <span className="muto"> nel #{t.doppione_di}</span>}
                  </div>
                </div>
              </td>
              {socio && (
                <td>
                  <div className="riga-dati">
                    {t.utente_id ? <Persona id={t.utente_id} nome={t.nome} cognome={t.cognome} /> : <span className="muto">—</span>}
                  </div>
                </td>
              )}
              <td>
                <div className="riga-dati">
                  <strong>{t.aperto_da_nome ?? '—'}</strong>
                  <span className="muto">{formatoData(t.aperto_il)}</span>
                  {t.tipo === 'modifica' && t.dal && <span className="normale">dal {formatoData(t.dal)}</span>}
                </div>
              </td>
              <td>
                <div className="riga-dati">
                  <span className="normale">{formatoFa(t.aggiornato_il)}</span>
                  <span className="muto">
                    {t.messaggi} {t.messaggi === 1 ? 'messaggio' : 'messaggi'}
                    {t.allegati > 0 && ` · ${t.allegati} ${t.allegati === 1 ? 'allegato' : 'allegati'}`}
                    {t.preso_nome && ` · ${t.preso_nome}`}
                  </span>
                  {t.ultimo_lato === 'r2d' && t.stato === 'in_attesa' && <span className="testo-rosso">R2D aspetta una risposta</span>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
