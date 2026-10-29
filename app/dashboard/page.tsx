import Link from 'next/link'
import { crm } from '@/lib/crm'
import { Avviso } from '@/components/Ui'
import { SchedeNumeri } from '@/components/SchedeNumeri'
import { eAdmin, puoVedere } from '@/lib/permessi'
import { consulenteScelto } from '@/components/FiltroConsulente'
import { PerformanceConsulente } from '@/components/PerformanceConsulente'

// «Quando aprono c'avranno lead da gestire, prove da gestire, abbonamenti in
// scadenza» (riunione del 28/09/2026): la home e' il lavoro di oggi. E' la Dashboard
// consulente: in cima i riquadri, ognuno porta alla sua sezione (niente elenchi qui);
// sotto, la performance settimanale del consulente. Un admin puo' guardare quella di un
// altro (`?consulente=`).
export default async function DaGestire({ searchParams }: { searchParams: { errore?: string; consulente?: string } }) {
  const [h, io, staff] = await Promise.all([crm.home(), crm.io(), crm.staff()])
  const senza = h.lead_da_gestire + h.iscrizioni_da_assegnare
  const schede = [
    ...(puoVedere(io, 'lead')
      ? [{ chiave: 'senza_consulente', testo: 'Senza consulente', n: senza, nota: 'opportunità e contratti da prendere in carico, più le prove', caldo: senza > 0, href: '/dashboard/senza-consulente', vaiTesto: 'Vai a Senza consulente' }]
      : []),
    { chiave: 'prove', testo: 'Prove in scadenza', n: h.prove_in_scadenza, nota: `entro 3 giorni · ${h.prove_in_corso} in corso`, caldo: h.prove_in_scadenza > 0, href: '/dashboard/prove?vista=in_scadenza', vaiTesto: 'Vai a Prove' },
    ...(puoVedere(io, 'rinnovi')
      ? [{ chiave: 'rinnovi', testo: 'Rinnovi da gestire', n: h.rinnovi_da_gestire, nota: `non ancora presi in carico · ${h.miei_rinnovi} miei`, caldo: h.rinnovi_da_gestire > 0, href: '/dashboard/rinnovi?vista=da_gestire', vaiTesto: 'Vai a Rinnovi' }]
      : []),
    ...(puoVedere(io, 'disdette')
      ? [{ chiave: 'disdette', testo: 'Disdette da gestire', n: h.disdette_da_gestire, nota: `non ancora prese in carico · ${h.mie_disdette} mie`, caldo: h.disdette_da_gestire > 0, href: '/dashboard/disdette?vista=da_gestire', vaiTesto: 'Vai a Disdette' }]
      : []),
    { chiave: 'task', testo: 'I miei task', n: h.miei_task_oggi + h.miei_task_arretrati, nota: `${h.miei_task_oggi} oggi · ${h.miei_task_arretrati} arretrati`, caldo: h.miei_task_arretrati > 0, href: '/dashboard/task?chi=miei&quando=arretrati', vaiTesto: 'Vai a Task' },
  ]
  const altro = eAdmin(io) ? consulenteScelto(staff, searchParams.consulente) : null
  const performance = await crm.performance(altro && altro !== io?.id ? altro : null)

  return (
    <>
      <div className="testata">
        <div>
          <div className="titolo-riga">
            <h1>Dashboard consulente</h1>
          </div>
        </div>
        <Link className="bottone" href="/dashboard/lead/nuovo">+ Nuova opportunità</Link>
      </div>

      <Avviso errore={searchParams.errore} />

      <section className="scheda" id="da-gestire">
        <SchedeNumeri voci={schede} attiva="" base="/dashboard" />
      </section>

      <PerformanceConsulente p={performance} staff={staff} consulente={altro} admin={eAdmin(io)} propria={performance.consulente_id === io?.id} inScheda />

      {puoVedere(io, 'contratti') && (
        <div className="numeri">
          <Link href="/dashboard/contratti" className="numero">
            <div className="etichetta">Contratti da controllare</div>
            <div className="valore">{h.contratti_da_controllare}</div>
            <div className="nota">pagamento, codice fiscale, tessera</div>
          </Link>
        </div>
      )}
    </>
  )
}
