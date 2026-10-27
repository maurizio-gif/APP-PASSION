import Link from 'next/link'
import { crm } from '@/lib/crm'
import { formatoGiornoLungo, oggiRoma } from '@/lib/formato'
import { Avviso } from '@/components/Ui'
import { assiste, eAdmin, puoVedere, smista } from '@/lib/permessi'
import { consulenteScelto } from '@/components/FiltroConsulente'
import { PerformanceConsulente } from '@/components/PerformanceConsulente'

// «Quando aprono c'avranno lead da gestire, prove da gestire, abbonamenti in
// scadenza» (riunione del 28/09/2026): la home e' il lavoro di oggi. Si chiama
// Dashboard consulente: in cima i numeri di oggi, ognuno porta alla sua
// sezione (niente tabelle di anteprima: l'elenco sta li'), sotto la performance
// settimanale del consulente. Un admin puo' guardare quella di un altro
// (`?consulente=`).
export default async function DaGestire({ searchParams }: { searchParams: { errore?: string; consulente?: string } }) {
  const [h, io, staff] = await Promise.all([crm.home(), crm.io(), crm.staff()])
  const altro = eAdmin(io) ? consulenteScelto(staff, searchParams.consulente) : null
  const performance = await crm.performance(altro && altro !== io?.id ? altro : null)
  const ticket = puoVedere(io, 'ticket') ? await crm.ticketConti() : null

  return (
    <>
      <div className="testata">
        <div>
          <h1>Dashboard consulente</h1>
          <p>Ciao {io?.nome}, {formatoGiornoLungo(oggiRoma())}.</p>
        </div>
        <Link className="bottone" href="/dashboard/lead/nuovo">+ Nuova opportunità</Link>
      </div>

      <Avviso errore={searchParams.errore} />

      <div className="numeri">
        <Link href="/dashboard/lead?vista=da_gestire" className={`numero${h.lead_da_gestire ? ' caldo' : ''}`}>
          <div className="etichetta">Opportunità da gestire</div>
          <div className="valore">{h.lead_da_gestire}</div>
          <div className="nota">non ancora presi in carico</div>
        </Link>
        <Link href="/dashboard/lead?vista=mie" className="numero">
          <div className="etichetta">Le mie opportunità</div>
          <div className="valore">{h.miei_lead}</div>
          <div className="nota">in gestione a me</div>
        </Link>
        <Link href="/dashboard/prove?vista=in_scadenza" className={`numero${h.prove_in_scadenza ? ' caldo' : ''}`}>
          <div className="etichetta">Prove in scadenza</div>
          <div className="valore">{h.prove_in_scadenza}</div>
          <div className="nota">entro 3 giorni · {h.prove_in_corso} in corso</div>
        </Link>
        {puoVedere(io, 'contratti') && (
          <Link href="/dashboard/contratti" className="numero">
            <div className="etichetta">Contratti da controllare</div>
            <div className="valore">{h.contratti_da_controllare}</div>
            <div className="nota">pagamento, codice fiscale, tessera</div>
          </Link>
        )}
        {puoVedere(io, 'disdette') && (
          <Link href="/dashboard/disdette?vista=da_gestire" className={`numero${h.disdette_da_gestire ? ' caldo' : ''}`}>
            <div className="etichetta">Disdette da gestire</div>
            <div className="valore">{h.disdette_da_gestire}</div>
            <div className="nota">non ancora prese in carico · {h.mie_disdette} mie</div>
          </Link>
        )}
        {puoVedere(io, 'lead') && (
          <Link href="/dashboard/contratti-senza-consulente" className={`numero${h.iscrizioni_da_assegnare ? ' caldo' : ''}`}>
            <div className="etichetta">Contratti senza consulente</div>
            <div className="valore">{h.iscrizioni_da_assegnare}</div>
            <div className="nota">nuovi abbonamenti da prendere in carico</div>
          </Link>
        )}
        {puoVedere(io, 'rinnovi') && (
          <Link href="/dashboard/rinnovi?vista=da_gestire" className={`numero${h.rinnovi_da_gestire ? ' caldo' : ''}`}>
            <div className="etichetta">Rinnovi da gestire</div>
            <div className="valore">{h.rinnovi_da_gestire}</div>
            <div className="nota">non ancora presi in carico · {h.miei_rinnovi} miei</div>
          </Link>
        )}
        <Link href="/dashboard/task?chi=miei&quando=arretrati" className={`numero${h.miei_task_arretrati ? ' caldo' : ''}`}>
          <div className="etichetta">I miei task</div>
          <div className="valore">{h.miei_task_oggi + h.miei_task_arretrati}</div>
          <div className="nota">{h.miei_task_oggi} oggi · {h.miei_task_arretrati} arretrati</div>
        </Link>
        {ticket && smista(io) && (
          <Link href="/dashboard/ticket?vista=da_verificare" className={`numero${ticket.da_verificare ? ' caldo' : ''}`}>
            <div className="etichetta">Ticket da verificare</div>
            <div className="valore">{ticket.da_verificare}</div>
            <div className="nota">{ticket.proposte ? `${ticket.proposte} proposte per la riunione` : 'segnalazioni del desk'}</div>
          </Link>
        )}
        {ticket && assiste(io) && (
          <Link href="/dashboard/ticket?vista=r2d" className={`numero${ticket.bloccanti ? ' caldo' : ''}`}>
            <div className="etichetta">Ticket per R2D</div>
            <div className="valore">{ticket.r2d}</div>
            <div className="nota">{ticket.bloccanti ? `${ticket.bloccanti} bloccano il lavoro` : `${ticket.modifiche_da_confermare + ticket.modifiche_da_rilasciare} modifiche aperte`}</div>
          </Link>
        )}
        {ticket && (
          <Link href="/dashboard/ticket?vista=in_attesa" className={`numero${ticket.in_attesa && !assiste(io) ? ' caldo' : ''}`}>
            <div className="etichetta">Ticket in attesa</div>
            <div className="valore">{ticket.in_attesa}</div>
            <div className="nota">R2D aspetta una risposta · {ticket.miei} aperti da me</div>
          </Link>
        )}
      </div>

      <PerformanceConsulente p={performance} staff={staff} consulente={altro} admin={eAdmin(io)} propria={performance.consulente_id === io?.id} />
    </>
  )
}
