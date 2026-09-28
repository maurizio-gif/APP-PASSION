import Link from 'next/link'
import { crm } from '@/lib/crm'
import { formatoDataOra, TIPO_TASK, traduci } from '@/lib/formato'
import { Avviso, Contatti, Persona, Vuoto } from '@/components/Ui'
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

export default async function Task({ searchParams }: { searchParams: { chi?: string; quando?: string; errore?: string } }) {
  const chi = CHI.some((v) => v.chiave === searchParams.chi) ? searchParams.chi! : 'miei'
  const quando = QUANDO.some((v) => v.chiave === searchParams.quando) ? searchParams.quando! : 'oggi'
  const task = await crm.task(chi, quando)
  const qui = `/dashboard/task?chi=${chi}&quando=${quando}`

  return (
    <>
      <div className="testata">
        <div>
          <h1>Task</h1>
          <p>Le cose da fare: si creano dalla scheda della persona e si chiudono con l&apos;esito.</p>
        </div>
      </div>
      <Avviso errore={searchParams.errore} />
      <div className="schede-vista">
        {CHI.map((v) => (
          <Link key={v.chiave} href={`/dashboard/task?chi=${v.chiave}&quando=${quando}`} className={v.chiave === chi ? 'attivo' : undefined}>{v.testo}</Link>
        ))}
      </div>
      <div className="schede-vista">
        {QUANDO.map((v) => (
          <Link key={v.chiave} href={`/dashboard/task?chi=${chi}&quando=${v.chiave}`} className={v.chiave === quando ? 'attivo' : undefined}>{v.testo}</Link>
        ))}
      </div>

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
                    <Persona id={t.utente_id} nome={t.nome} cognome={t.cognome} />
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
