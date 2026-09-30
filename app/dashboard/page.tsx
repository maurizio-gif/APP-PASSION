import Link from 'next/link'
import { crm } from '@/lib/crm'
import { formatoGiornoLungo, formatoOra, oggiRoma, traduci, TIPO_TASK } from '@/lib/formato'
import { Avviso, Persona, Provenienza, Vuoto } from '@/components/Ui'
import { assiste, puoVedere, smista } from '@/lib/permessi'
import { TabellaLead } from '@/components/TabellaLead'
import { completaTask } from './azioni'

// «Quando aprono c'avranno lead da gestire, prove da gestire, abbonamenti in
// scadenza» (riunione del 28/09/2026): la home e' il lavoro di oggi.
export default async function DaGestire({ searchParams }: { searchParams: { errore?: string } }) {
  const [h, io, arretrati, oggi, nuovi, scadenza, staff] = await Promise.all([
    crm.home(),
    crm.io(),
    crm.task('miei', 'arretrati'),
    crm.task('miei', 'oggi'),
    crm.lead('da_gestire', null, null),
    crm.prove('in_scadenza'),
    crm.staff(),
  ])
  const task = [...arretrati, ...oggi]
  const ticket = puoVedere(io, 'ticket') ? await crm.ticketConti() : null

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

      <section className="scheda">
        <div className="testata-scheda">
          <h2>Lead da gestire</h2>
          <Link href="/dashboard/lead?vista=da_gestire">Tutti →</Link>
        </div>
        {nuovi.length === 0 ? (
          <Vuoto>Tutti i lead sono presi in carico.</Vuoto>
        ) : (
          <TabellaLead lead={nuovi.slice(0, 15)} io={io} staff={staff} torna="/dashboard" />
        )}
      </section>

      <div className="griglia">
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

        <section className="scheda">
          <h2>Prove in scadenza</h2>
          {scadenza.length === 0 ? (
            <Vuoto>Nessuna prova finisce nei prossimi tre giorni.</Vuoto>
          ) : (
            <ul className="elenco">
              {scadenza.map((p) => (
                <li key={p.id}>
                  <Persona id={p.utente_id} nome={p.nome} cognome={p.cognome} />{' '}
                  <span className="bollino giallo">{p.giorni_rimasti === 0 ? 'oggi' : p.giorni_rimasti === 1 ? 'domani' : `tra ${p.giorni_rimasti} gg`}</span>
                  <div className="piccolo attenuato">
                    {p.tipo_pass} · {p.ingressi} ingressi · {p.prenotazioni} lezioni prenotate
                    {p.gestito_nome ? ` · segue ${p.gestito_nome}` : ' · nessuno la segue'}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

    </>
  )
}
