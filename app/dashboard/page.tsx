import Link from 'next/link'
import { crm } from '@/lib/crm'
import { formatoGiornoLungo, formatoOra, oggiRoma, traduci, TIPO_TASK } from '@/lib/formato'
import { Persona, Vuoto } from '@/components/Ui'
import { TabellaLead } from '@/components/TabellaLead'
import { completaTask } from './azioni'

// «Quando aprono c'avranno lead da gestire, prove da gestire, abbonamenti in
// scadenza» (riunione del 28/09/2026): la home e' il lavoro di oggi.
export default async function DaGestire() {
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

  return (
    <>
      <div className="testata">
        <div>
          <h1>Da gestire</h1>
          <p>Ciao {io?.nome}, {formatoGiornoLungo(oggiRoma())}.</p>
        </div>
        <Link className="bottone" href="/dashboard/lead/nuovo">+ Nuovo lead</Link>
      </div>

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
          <div className="nota">entro 2 giorni · {h.prove_in_corso} in corso</div>
        </Link>
        <Link href="/dashboard/contratti" className="numero">
          <div className="etichetta">Contratti da controllare</div>
          <div className="valore">{h.contratti_da_controllare}</div>
          <div className="nota">pagamento, codice fiscale, tessera</div>
        </Link>
        <Link href="/dashboard/disdette" className="numero">
          <div className="etichetta">Disdette</div>
          <div className="valore">{h.disdette_da_gestire}</div>
          <div className="nota">da chiamare o in sospeso</div>
        </Link>
        <Link href="/dashboard/task?chi=miei&quando=arretrati" className={`numero${h.miei_task_arretrati ? ' caldo' : ''}`}>
          <div className="etichetta">I miei task</div>
          <div className="valore">{h.miei_task_oggi + h.miei_task_arretrati}</div>
          <div className="nota">{h.miei_task_oggi} oggi · {h.miei_task_arretrati} arretrati</div>
        </Link>
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
                      <Persona id={t.utente_id} nome={t.nome} cognome={t.cognome} />
                      {t.nota && <div className="piccolo">{t.nota}</div>}
                    </div>
                    <form action={completaTask} className="azioni-riga">
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
            <Vuoto>Nessuna prova finisce nei prossimi due giorni.</Vuoto>
          ) : (
            <ul className="elenco">
              {scadenza.map((p) => (
                <li key={p.id}>
                  <Persona id={p.utente_id} nome={p.nome} cognome={p.cognome} />{' '}
                  <span className="bollino giallo">{p.giorni_rimasti != null && p.giorni_rimasti <= 1 ? 'domani' : `tra ${p.giorni_rimasti} gg`}</span>
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
