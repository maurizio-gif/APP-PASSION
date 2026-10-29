import type { Io, Operatore } from '@/lib/crm'
import { puoGestire } from '@/lib/permessi'

type Azione = (f: FormData) => Promise<void>

// Chi segue una disdetta o un rinnovo, come per i lead: di nessuno si prende
// («Prendo in carico»); mio (o con i permessi) si passa a un collega o si
// rimette da assegnare; di un collega si vede solo il nome. L'esito si scrive
// nella scheda della persona. `completo` e' la versione della scheda: bottoni
// pieni e la tendina anche su quello di nessuno.
export function InCarico({ id, assegnatoA, assegnatoNome, aperto, io, staff, torna, assegna, rilascia, completo = false }: {
  id: string
  assegnatoA: string | null
  assegnatoNome: string | null
  aperto: boolean
  io: Io
  staff: Operatore[]
  torna: string
  assegna: Azione
  rilascia: Azione
  completo?: boolean
}) {
  const piccolo = completo ? '' : ' piccolo'
  const campi = (
    <>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="torna" value={torna} />
    </>
  )
  if (!aperto) return assegnatoNome ? <span className="piccolo">{assegnatoNome}</span> : null

  const prendi = !assegnatoA && (
    <form action={assegna} className={completo ? 'azioni-scheda' : undefined}>
      {campi}
      <button className={`bottone${piccolo}`}>Prendo in carico</button>
    </form>
  )
  if (!puoGestire(io, assegnatoA)) return <span className="piccolo">{assegnatoNome}</span>
  if (!assegnatoA && !completo) return prendi

  // Chi lo segue ma non e' fra gli operatori (un admin, uno spento) resta scelto, col suo nome.
  const fuori = assegnatoA && !staff.some((o) => o.id === assegnatoA)
  return (
    <div className={completo ? 'azioni-blocco' : undefined}>
      {prendi}
      <div className="azioni-gruppo">
        <form action={assegna} className="azioni-riga">
          {campi}
          <select name="staff" defaultValue={assegnatoA ?? ''} aria-label="Assegna a" className="piccola" required>
            <option value="" disabled>Assegna a…</option>
            {fuori && <option value={assegnatoA}>{assegnatoNome ?? 'Operatore'}</option>}
            {staff.map((o) => <option key={o.id} value={o.id}>{o.nome} {o.cognome ?? ''}</option>)}
          </select>
          <button className="bottone secondario piccolo">Assegna</button>
        </form>
        {assegnatoA && (
          <form action={rilascia}>
            {campi}
            <button className="bottone secondario piccolo icona" title="Rimetti da assegnare: torna fra quelli da gestire, senza nessuno" aria-label="Rimetti da assegnare"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3" /></svg></button>
          </form>
        )}
      </div>
    </div>
  )
}
