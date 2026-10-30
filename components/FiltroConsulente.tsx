import type { Operatore } from '@/lib/crm'

// Il filtro per consulente, uguale in ogni sezione: una tendina con gli
// operatori che ricevono lead e task (`crm.staff()`), che rimanda alla stessa
// pagina con `consulente=<id>` e gli altri parametri della vista (`tieni`).
// `children`: altre tendine della sezione, inviate con lo stesso Filtra.
export function FiltroConsulente({ azione, staff, consulente, tieni = {}, q, classe = '', conNessuno = false, children }: {
  azione: string
  staff: Operatore[]
  consulente: string | null
  tieni?: Record<string, string>
  // Il testo cercato (null: nessuno). Se manca del tutto, la ricerca non c'e'.
  q?: string | null
  // Classe in piu' sul modulo (filtri-largo: sul telefono ogni campo sta su una riga).
  classe?: string
  // Aggiunge «Nessun consulente»: le righe che nessuno segue.
  conNessuno?: boolean
  children?: React.ReactNode
}) {
  return (
    <form className={`filtri ${classe}`.trim()} action={azione}>
      {Object.entries(tieni).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {q !== undefined && (
        <input type="search" name="q" defaultValue={q ?? ''} placeholder="Nome, cognome, telefono, email" aria-label="Cerca" />
      )}
      <select name="consulente" defaultValue={consulente ?? ''} aria-label="Consulente">
        <option value="">Tutti i consulenti</option>
        {conNessuno && <option value={NESSUN_CONSULENTE}>Nessun consulente</option>}
        {staff.map((o) => <option key={o.id} value={o.id}>{o.nome} {o.cognome ?? ''}</option>)}
      </select>
      {children}
      <button className="bottone secondario" type="submit">Filtra</button>
    </form>
  )
}

// «Nessun consulente»: un uuid a zero, che non e' di nessun operatore.
export const NESSUN_CONSULENTE = '00000000-0000-0000-0000-000000000000'

// Il consulente dai parametri della pagina, solo se e' uno degli operatori
// (o «Nessun consulente», dove la pagina lo prevede).
export const consulenteScelto = (staff: Operatore[], id: string | undefined, conNessuno = false) =>
  staff.some((o) => o.id === id) || (conNessuno && id === NESSUN_CONSULENTE) ? id! : null
