import Link from 'next/link'
import { crm } from '@/lib/crm'
import { formatoGiornoLungo, formatoOra, oggiRoma, traduci, TIPO_TASK } from '@/lib/formato'
import { Avviso, Persona, Provenienza, Schede, Vuoto } from '@/components/Ui'
import { assiste, puoVedere, smista } from '@/lib/permessi'
import { TabellaLead } from '@/components/TabellaLead'
import { TabellaRinnovi } from '@/components/TabellaRinnovi'
import { TabellaDisdette } from '@/components/TabellaDisdette'
import { TabellaProve } from '@/components/TabellaProve'
import { completaTask } from './azioni'

// «Nessun consulente»: i lead senza assegnatario (uuid a zero per crm_lead).
const NESSUN_CONSULENTE = '00000000-0000-0000-0000-000000000000'

// «Quando aprono c'avranno lead da gestire, prove da gestire, abbonamenti in
// scadenza» (riunione del 28/09/2026): la home e' il lavoro di oggi.
export default async function DaGestire({ searchParams }: { searchParams: { errore?: string; vista?: string } }) {
  const [h, io, arretrati, oggi, staff] = await Promise.all([
    crm.home(),
    crm.io(),
    crm.task('miei', 'arretrati'),
    crm.task('miei', 'oggi'),
    crm.staff(),
  ])
  const task = [...arretrati, ...oggi]
  // «Da gestire» di Lead, Rinnovi, Disdette e Prove in scadenza in schede, piu'
  // «Non assegnati»: i lead aperti e le prove in corso senza un consulente. Si
  // carica solo la scheda aperta, come nella sua sezione.
  const schede: { chiave: string; testo: string; n?: number; vai: string }[] = [
    { chiave: 'lead', testo: 'Lead', n: h.lead_da_gestire, vai: '/dashboard/lead?vista=da_gestire' },
    ...(puoVedere(io, 'rinnovi') ? [{ chiave: 'rinnovi', testo: 'Rinnovi', n: h.rinnovi_da_gestire, vai: '/dashboard/rinnovi?vista=da_gestire' }] : []),
    ...(puoVedere(io, 'disdette') ? [{ chiave: 'disdette', testo: 'Disdette', n: h.disdette_da_gestire, vai: '/dashboard/disdette?vista=da_gestire' }] : []),
    { chiave: 'prove', testo: 'Prove in scadenza', n: h.prove_in_scadenza, vai: '/dashboard/prove?vista=in_scadenza' },
    { chiave: 'non_assegnati', testo: 'Non assegnati', vai: '/dashboard/lead?vista=tutte&consulente=' + NESSUN_CONSULENTE },
  ]
  const aperta = schede.find((s) => s.chiave === searchParams.vista) ?? schede[0]
  const scheda = aperta.chiave
  const qui = scheda === 'lead' ? '/dashboard' : `/dashboard?vista=${scheda}`
  const [nuovi, rinnovi, disdette, prove, liberi, ticket] = await Promise.all([
    scheda === 'lead' ? crm.lead('da_gestire', null, null) : null,
    scheda === 'rinnovi' ? crm.rinnovi('da_gestire') : null,
    scheda === 'disdette' ? crm.disdette('da_gestire') : null,
    scheda === 'prove' ? crm.prove('in_scadenza') : scheda === 'non_assegnati' ? crm.prove('in_corso') : null,
    scheda === 'non_assegnati' ? crm.lead('tutte', null, null, NESSUN_CONSULENTE) : null,
    puoVedere(io, 'ticket') ? crm.ticketConti() : null,
  ])
  // Non assegnati: dei lead solo quelli ancora aperti, delle prove quelle che nessuno segue.
  const leadLiberi = liberi?.filter((l) => l.fase === 'da_gestire' || l.fase === 'in_gestione') ?? null
  const proveLibere = scheda === 'non_assegnati' ? prove?.filter((p) => !p.gestito_da && !p.esito) ?? [] : null
  const proveScadenza = scheda === 'prove' ? prove : null
  if (leadLiberi && proveLibere) aperta.n = leadLiberi.length + proveLibere.length
  const pagamenti = await crm.pagamenti([...(proveScadenza ?? []), ...(proveLibere ?? [])].map((p) => p.contract_id))

  return (
    <>
      <div className="testata">
        <div>
          <h1>Da gestire</h1>
          <p>Ciao {io?.nome}, {formatoGiornoLungo(oggiRoma())}.</p>
        </div>
        <Link className="bottone" href="/dashboard/lead/nuovo">+ Nuovo lead</Link>
      </div>

      <Avviso errore={searchParams.errore} />

      <div className="numeri">
        <Link href="/dashboard/lead?vista=da_gestire" className={`numero${h.lead_da_gestire ? ' caldo' : ''}`}>
          <div className="etichetta">Lead da gestire</div>
          <div className="valore">{h.lead_da_gestire}</div>
          <div className="nota">non ancora presi in carico</div>
        </Link>
        <Link href="/dashboard/lead?vista=mie" className="numero">
          <div className="etichetta">I miei lead</div>
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

      <section className="scheda" id="da-gestire">
        <div className="testata-scheda">
          <h2>Da gestire</h2>
          <Link href={aperta.vai}>Vai a {scheda === 'non_assegnati' ? 'Lead' : aperta.testo} →</Link>
        </div>
        <Schede voci={schede} attiva={scheda} base="/dashboard" />
        <div className="da-gestire-corpo">
          {nuovi && (nuovi.length === 0 ? (
            <Vuoto>Tutti i lead sono presi in carico.</Vuoto>
          ) : (
            <TabellaLead lead={nuovi.slice(0, 15)} io={io} staff={staff} torna={qui} />
          ))}
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
          {leadLiberi && proveLibere && (
            leadLiberi.length + proveLibere.length === 0 ? (
              <Vuoto>Tutti i lead aperti e tutte le prove in corso hanno un consulente.</Vuoto>
            ) : (
              <>
                <h3 className="da-gestire-titolo">Lead senza consulente <span className="attenuato">· {leadLiberi.length}</span></h3>
                {leadLiberi.length === 0 ? <Vuoto>Nessuno.</Vuoto> : <TabellaLead lead={leadLiberi.slice(0, 30)} io={io} staff={staff} torna={qui} />}
                <h3 className="da-gestire-titolo">Prove in corso che nessuno segue <span className="attenuato">· {proveLibere.length}</span></h3>
                {proveLibere.length === 0 ? <Vuoto>Nessuna.</Vuoto> : <TabellaProve prove={proveLibere.slice(0, 30)} pagamenti={pagamenti} staff={staff} torna={qui} />}
              </>
            )
          )}
        </div>
      </section>

      <section className="scheda">
        <h2>I miei task</h2>
        {task.length === 0 ? (
          <Vuoto>Niente in agenda per oggi.</Vuoto>
        ) : (
          <ul className="elenco">
            {task.slice(0, 15).map((t) => (
              <li key={t.id}>
                <div className="elenco-riga">
                  <div>
                    <span className={`bollino${t.data && new Date(t.data) < new Date() ? ' rosso' : ''}`}>
                      {traduci(TIPO_TASK, t.tipo)} {formatoOra(t.data)}
                    </span>{' '}
                    <Provenienza origine={t.origine} />{' '}
                    <Persona id={t.utente_id} nome={t.nome} cognome={t.cognome} nuovaScheda />
                    {t.nota && <div className="piccolo">{t.nota}</div>}
                  </div>
                  <form action={completaTask} className="azioni-riga pila">
                    <input type="hidden" name="task" value={t.id} />
                    <input type="hidden" name="torna" value="/dashboard" />
                    <button className="bottone piccolo" name="esito" value="positivo">Fatto ✓</button>
                    <button className="bottone secondario piccolo" name="esito" value="negativo">Non risponde</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
        {task.length > 15 && <Link href="/dashboard/task">Tutti i task →</Link>}
      </section>
    </>
  )
}
