import Link from 'next/link'
import { crm, richiediSezione } from '@/lib/crm'
import { formatoDataOra, TIPO_TASK, traduci } from '@/lib/formato'
import { Avviso, Contatti, Persona, Provenienza, Vuoto } from '@/components/Ui'
import { FiltroConsulente, consulenteScelto } from '@/components/FiltroConsulente'
import { completaTask } from '../azioni'

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

export default async function Task({ searchParams }: { searchParams: { chi?: string; quando?: string; consulente?: string; errore?: string } }) {
  await richiediSezione('task')
  const staff = await crm.staff()
  // Un consulente scelto: i suoi task, di chiunque sia la vista «chi».
  const consulente = consulenteScelto(staff, searchParams.consulente)
  const chi = consulente ? 'tutti' : CHI.some((v) => v.chiave === searchParams.chi) ? searchParams.chi! : 'miei'
  const quando = QUANDO.some((v) => v.chiave === searchParams.quando) ? searchParams.quando! : 'oggi'
  const task = await crm.task(chi, quando, consulente)
  const perConsulente = consulente ? `&consulente=${consulente}` : ''
  const qui = `/dashboard/task?chi=${chi}&quando=${quando}${perConsulente}`

  return (
    <>
      <div className="testata">
        <div>
          <h1>Task</h1>
          <p>Tutto il lavoro, da ogni sezione: lead, scadenze dei pass, rinnovi, disdette, debiti. Si creano dalla scheda della persona (o nascono da soli) e si chiudono con l&apos;esito.</p>
        </div>
      </div>
      <Avviso errore={searchParams.errore} />
      <div className="schede-vista">
        {CHI.map((v) => (
          <Link key={v.chiave} href={`/dashboard/task?chi=${v.chiave}&quando=${quando}`} className={!consulente && v.chiave === chi ? 'attivo' : undefined}>{v.testo}</Link>
        ))}
      </div>
      <div className="schede-vista">
        {QUANDO.map((v) => (
          <Link key={v.chiave} href={`/dashboard/task?chi=${chi}&quando=${v.chiave}${perConsulente}`} className={v.chiave === quando ? 'attivo' : undefined}>{v.testo}</Link>
        ))}
      </div>
      <FiltroConsulente azione="/dashboard/task" staff={staff} consulente={consulente} tieni={{ chi: 'tutti', quando }} />

      <div className="scheda">
        {task.length === 0 ? (
          <Vuoto>Nessun task qui.</Vuoto>
        ) : (
          <ul className="elenco">
            {task.map((t) => (
              <li key={t.id}>
                <div className="elenco-riga">
                  <div>
                    <span className={`bollino${!t.completato_il && t.data && new Date(t.data) < new Date() ? ' rosso' : ''}`}>
                      {traduci(TIPO_TASK, t.tipo)} · {formatoDataOra(t.data)}
                    </span>{' '}
                    <Provenienza origine={t.origine} />{' '}
                    <Persona id={t.utente_id} nome={t.nome} cognome={t.cognome} nuovaScheda />
                    {chi !== 'miei' && <span className="piccolo attenuato"> · {t.assegnato_nome ?? 'nessuno'}</span>}
                    <Contatti telefono={t.telefono} email={null} />
                    {t.nota && <div className="piccolo">{t.nota}</div>}
                    {t.completato_il && (
                      <div className="piccolo attenuato">
                        fatto {formatoDataOra(t.completato_il)}{' '}
                        {t.esito && <span className={`bollino ${t.esito === 'positivo' ? 'verde' : 'rosso'}`}>{t.esito}</span>}
                      </div>
                    )}
                  </div>
                  {!t.completato_il && (
                    <form action={completaTask} className="azioni-riga">
                      <input type="hidden" name="task" value={t.id} />
                      <input type="hidden" name="torna" value={qui} />
                      <input type="text" name="nota" placeholder="Com'è andata" />
                      <button className="bottone piccolo" name="esito" value="positivo">Fatto ✓</button>
                      <button className="bottone secondario piccolo" name="esito" value="negativo">Negativo</button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
