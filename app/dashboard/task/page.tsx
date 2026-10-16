import { crm, richiediSezione } from '@/lib/crm'
import { Avviso, LinkGuida, SchedeMulti, Vuoto } from '@/components/Ui'
import { TabellaTask } from '@/components/TabellaTask'
import { completaTask } from '../azioni'
import { FiltroConsulente, consulenteScelto } from '@/components/FiltroConsulente'
import { filtraTesto, testoCercato } from '@/lib/ricerca'

const CHI = [
  { chiave: 'miei', testo: 'I miei' },
  { chiave: 'tutti', testo: 'Di tutti' },
  { chiave: 'nessuno', testo: 'Senza assegnatario' },
]
const QUANDO = [
  { chiave: 'arretrati', testo: 'Arretrati' },
  { chiave: 'oggi', testo: 'Oggi' },
  { chiave: 'prossimi', testo: 'Prossimi' },
  { chiave: 'fatti', testo: 'Fatti' },
]

export default async function Task({ searchParams }: { searchParams: { chi?: string; quando?: string; consulente?: string; q?: string; errore?: string } }) {
  await richiediSezione('task')
  const staff = await crm.staff()
  // Un consulente scelto: i suoi task, di chiunque sia la vista «chi».
  const consulente = consulenteScelto(staff, searchParams.consulente)
  const chi = consulente ? 'tutti' : CHI.some((v) => v.chiave === searchParams.chi) ? searchParams.chi! : 'miei'
  const quando = QUANDO.some((v) => v.chiave === searchParams.quando) ? searchParams.quando! : 'oggi'
  const q = testoCercato(searchParams.q)
  const task = filtraTesto(await crm.task(chi, quando, consulente), q)
  const perQ = q ? `&q=${encodeURIComponent(q)}` : ''
  const perConsulente = `${consulente ? `&consulente=${consulente}` : ''}${perQ}`
  const qui = `/dashboard/task?chi=${chi}&quando=${quando}${perConsulente}`

  return (
    <>
      <div className="testata">
        <div>
          <div className="titolo-riga">
            <h1>Task</h1>
            <span className="aiuto-titolo" tabIndex={0} role="note" aria-label="Cos'è questa sezione">
              <span className="aiuto-punto" aria-hidden="true">?</span>
              <span className="aiuto-testo">Tutto il lavoro, da ogni sezione: lead, scadenze dei pass, rinnovi, disdette, debiti. Si creano dalla scheda della persona (o nascono da soli) e si chiudono con l&apos;esito.{' '}<LinkGuida argomento="task" /></span>
            </span>
          </div>
        </div>
      </div>
      <Avviso errore={searchParams.errore} />
      <SchedeMulti gruppi={[
        { testo: 'Di chi', tono: 'lavoro', voci: CHI.map((v) => ({ testo: v.testo, href: `/dashboard/task?chi=${v.chiave}&quando=${quando}${perQ}`, attivo: !consulente && v.chiave === chi })) },
        { testo: 'Quando', tono: 'prova', voci: QUANDO.map((v) => ({ testo: v.testo, href: `/dashboard/task?chi=${chi}&quando=${v.chiave}${perConsulente}`, attivo: v.chiave === quando })) },
      ]} />
      <FiltroConsulente azione="/dashboard/task" staff={staff} consulente={consulente} tieni={{ chi: 'tutti', quando }} q={q} />

      <div className="scheda">
        {task.length === 0 ? (
          <Vuoto>Nessun task qui.</Vuoto>
        ) : (
          <TabellaTask task={task} chi={chi} torna={qui} completa={completaTask} />
        )}
      </div>
    </>
  )
}
