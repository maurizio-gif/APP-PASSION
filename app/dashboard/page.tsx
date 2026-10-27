import Link from 'next/link'
import { crm } from '@/lib/crm'
import { Avviso, Vuoto } from '@/components/Ui'
import { SchedeNumeri } from '@/components/SchedeNumeri'
import { eAdmin, puoVedere } from '@/lib/permessi'
import { consulenteScelto } from '@/components/FiltroConsulente'
import { PerformanceConsulente } from '@/components/PerformanceConsulente'
import { TabellaLead } from '@/components/TabellaLead'
import { TabellaRinnovi } from '@/components/TabellaRinnovi'
import { TabellaDisdette } from '@/components/TabellaDisdette'
import { TabellaProve } from '@/components/TabellaProve'
import { TabellaTask } from '@/components/TabellaTask'
import { TabellaContratti } from '@/components/VistaContratti'
import { completaTask } from './azioni'

// «Nessun consulente»: i lead senza assegnatario (uuid a zero per crm_lead).
const NESSUN_CONSULENTE = '00000000-0000-0000-0000-000000000000'

// «Quando aprono c'avranno lead da gestire, prove da gestire, abbonamenti in
// scadenza» (riunione del 28/09/2026): la home e' il lavoro di oggi.
export default async function DaGestire({ searchParams }: { searchParams: { errore?: string; vista?: string; consulente?: string } }) {
  const [h, io, staff] = await Promise.all([
    crm.home(),
    crm.io(),
    crm.staff(),
  ])
  // «Da gestire» di Lead, Rinnovi, Disdette e Prove in scadenza in schede, piu'
  // «Senza consulente»: i lead aperti e le prove in corso senza un consulente. Si
  // carica solo la scheda aperta, come nella sua sezione.
  const schede: { chiave: string; testo: string; n?: number; nota?: string; caldo?: boolean; vai?: string; vaiTesto?: string; vaiAltro?: { href: string; testo: string }; calcola?: boolean }[] = [
    { chiave: 'performance', testo: 'La mia performance', nota: 'abbonamenti venduti questa settimana', calcola: true},
    { chiave: 'non_assegnati', testo: 'Senza consulente', nota: 'opportunità, prove e contratti senza consulente', calcola: true, vai: '/dashboard/lead?vista=da_gestire', vaiTesto: 'Vai a Opportunità', vaiAltro: { href: '/dashboard/prove?vista=in_corso', testo: 'Vai a Prove' } },
    { chiave: 'prove', testo: 'Prove in scadenza', n: h.prove_in_scadenza, nota: `entro 3 giorni · ${h.prove_in_corso} in corso`, caldo: h.prove_in_scadenza > 0, vai: '/dashboard/prove?vista=in_scadenza', vaiTesto: 'Vai a Prove' },
    ...(puoVedere(io, 'rinnovi') ? [{ chiave: 'rinnovi', testo: 'Rinnovi da gestire', n: h.rinnovi_da_gestire, nota: `non ancora presi in carico · ${h.miei_rinnovi} miei`, caldo: h.rinnovi_da_gestire > 0, vai: '/dashboard/rinnovi?vista=da_gestire', vaiTesto: 'Vai a Rinnovi' }] : []),
    ...(puoVedere(io, 'disdette') ? [{ chiave: 'disdette', testo: 'Disdette da gestire', n: h.disdette_da_gestire, nota: `non ancora prese in carico · ${h.mie_disdette} mie`, caldo: h.disdette_da_gestire > 0, vai: '/dashboard/disdette?vista=da_gestire', vaiTesto: 'Vai a Disdette' }] : []),
    { chiave: 'task', testo: 'I miei task', n: h.miei_task_oggi + h.miei_task_arretrati, nota: `${h.miei_task_oggi} oggi · ${h.miei_task_arretrati} arretrati`, caldo: h.miei_task_arretrati > 0, vai: '/dashboard/task?chi=miei&quando=arretrati', vaiTesto: 'Vai a Task' },
  ]
  // Di base si apre «Senza consulente»: e' il lavoro da fare; la performance e' la prima scheda ma si apre a richiesta.
  const aperta = schede.find((s) => s.chiave === searchParams.vista) ?? schede.find((s) => s.chiave === 'non_assegnati')!
  const scheda = aperta.chiave
  const qui = scheda === 'non_assegnati' ? '/dashboard' : `/dashboard?vista=${scheda}`
  // La performance settimanale: la mia; un admin puo' guardare quella di un altro (`?consulente=`).
  const altro = eAdmin(io) ? consulenteScelto(staff, searchParams.consulente) : null
  const [rinnovi, disdette, prove, liberi, arretrati, oggi, performance, contratti] = await Promise.all([
    scheda === 'rinnovi' ? crm.rinnovi('da_gestire') : null,
    scheda === 'disdette' ? crm.disdette('da_gestire') : null,
    scheda === 'prove' ? crm.prove('in_scadenza') : scheda === 'non_assegnati' ? crm.prove('in_corso') : null,
    scheda === 'non_assegnati' ? crm.lead('tutte', null, null, NESSUN_CONSULENTE) : null,
    scheda === 'task' ? crm.task('miei', 'arretrati') : null,
    scheda === 'task' ? crm.task('miei', 'oggi') : null,
    scheda === 'performance' ? crm.performance(altro && altro !== io?.id ? altro : null) : null,
    scheda === 'non_assegnati' && puoVedere(io, 'lead') ? crm.iscrizioni('da_assegnare') : null,
  ])
  const task = arretrati && oggi ? [...arretrati, ...oggi] : null
  // Senza consulente: dei lead solo quelli ancora aperti, delle prove quelle che nessuno segue.
  const leadLiberi = liberi?.filter((l) => l.fase === 'da_gestire' || l.fase === 'in_gestione') ?? null
  const proveLibere = scheda === 'non_assegnati' ? prove?.filter((p) => !p.gestito_da && !p.esito) ?? [] : null
  const proveScadenza = scheda === 'prove' ? prove : null
  if (performance) aperta.n = performance.settimane[performance.settimane.length - 1]?.abbonamenti ?? 0
  if (leadLiberi && proveLibere) aperta.n = leadLiberi.length + proveLibere.length + (contratti?.length ?? 0)
  const pagamenti = await crm.pagamenti([...(proveScadenza ?? []), ...(proveLibere ?? [])].map((p) => p.contract_id))

  return (
    <>
      <div className="testata">
        <div>
          <div className="titolo-riga">
            <h1>Da gestire</h1>
          </div>
        </div>
        <Link className="bottone" href="/dashboard/lead/nuovo">+ Nuova opportunità</Link>
      </div>

      <Avviso errore={searchParams.errore} />

      <section className="scheda" id="da-gestire">
        <SchedeNumeri voci={schede} attiva={scheda} base="/dashboard" />
        <div className="da-gestire-corpo">
          {performance && <PerformanceConsulente p={performance} staff={staff} consulente={altro} admin={eAdmin(io)} propria={performance.consulente_id === io?.id} inScheda />}
          {rinnovi && (rinnovi.length === 0 ? (
            <Vuoto>Tutti i rinnovi sono presi in carico.</Vuoto>
          ) : (
            <TabellaRinnovi rinnovi={rinnovi.slice(0, 15)} io={io} staff={staff} torna={qui} />
          ))}
          {disdette && (disdette.length === 0 ? (
            <Vuoto>Tutte le disdette sono prese in carico.</Vuoto>
          ) : (
            <TabellaDisdette disdette={disdette.slice(0, 15)} io={io} staff={staff} torna={qui} />
          ))}
          {proveScadenza && (proveScadenza.length === 0 ? (
            <Vuoto>Nessuna prova finisce nei prossimi tre giorni.</Vuoto>
          ) : (
            <TabellaProve prove={proveScadenza} pagamenti={pagamenti} staff={staff} torna={qui} />
          ))}
          {task && (task.length === 0 ? (
            <Vuoto>Niente in agenda per oggi.</Vuoto>
          ) : (
            <>
              <TabellaTask task={task.slice(0, 15)} torna={qui} compatta completa={completaTask} />
              {task.length > 15 && <Link href="/dashboard/task">Tutti i task →</Link>}
            </>
          ))}
          {leadLiberi && proveLibere && (
            leadLiberi.length + proveLibere.length + (contratti?.length ?? 0) === 0 ? (
              <Vuoto>Tutte le opportunità aperte, le prove in corso e i contratti hanno un consulente.</Vuoto>
            ) : (
              <div className="na-toggle">
                <input type="radio" name="na-vista" id="na-v-opp" className="task-radio" defaultChecked />
                <input type="radio" name="na-vista" id="na-v-prove" className="task-radio" />
                {contratti && <input type="radio" name="na-vista" id="na-v-contr" className="task-radio" />}
                <div className="task-tabs na-tabs">
                  <label htmlFor="na-v-opp">Opportunità senza consulente <span>{leadLiberi.length}</span></label>
                  <label htmlFor="na-v-prove">Prove in corso senza consulente <span>{proveLibere.length}</span></label>
                  {contratti && <label htmlFor="na-v-contr">Contratti senza consulente <span>{contratti.length}</span></label>}
                </div>
                <div className="na-pannello na-opp">
                  {leadLiberi.length === 0 ? <Vuoto>Nessuna opportunità senza consulente.</Vuoto> : <TabellaLead lead={leadLiberi.slice(0, 30)} io={io} staff={staff} torna={qui} />}
                </div>
                <div className="na-pannello na-prove">
                  {proveLibere.length === 0 ? <Vuoto>Nessuna prova senza consulente.</Vuoto> : <TabellaProve prove={proveLibere.slice(0, 30)} pagamenti={pagamenti} staff={staff} torna={qui} />}
                </div>
                {contratti && (
                  <div className="na-pannello na-contr">
                    {contratti.length === 0 ? <Vuoto>Nessun contratto da prendere in carico.</Vuoto> : <TabellaContratti righe={contratti.slice(0, 30)} io={io} staff={staff} qui={qui} />}
                    <p className="piccolo attenuato"><Link href="/dashboard/contratti-senza-consulente">Tutti i contratti senza consulente →</Link></p>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </section>

      {puoVedere(io, 'contratti') && (
        <div className="numeri">
          {puoVedere(io, 'contratti') && (
            <Link href="/dashboard/contratti" className="numero">
              <div className="etichetta">Contratti da controllare</div>
              <div className="valore">{h.contratti_da_controllare}</div>
              <div className="nota">pagamento, codice fiscale, tessera</div>
            </Link>
          )}
        </div>
      )}

    </>
  )
}
