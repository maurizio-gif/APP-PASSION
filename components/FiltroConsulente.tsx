import type { Operatore } from '@/lib/crm'

// Il filtro per consulente, uguale in ogni sezione: una tendina con gli
// operatori che ricevono lead e task (`crm.staff()`), che rimanda alla stessa
// pagina con `consulente=<id>` e gli altri parametri della vista (`tieni`).
// `children`: altre tendine della sezione, inviate con lo stesso Filtra.
export function FiltroConsulente({ azione, staff, consulente, tieni = {}, children }: {
  azione: string
  staff: Operatore[]
  consulente: string | null
  tieni?: Record<string, string>
  children?: React.ReactNode
}) {
  return (
    <form className="filtri" action={azione}>
      {Object.entries(tieni).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <select name="consulente" defaultValue={consulente ?? ''} aria-label="Consulente">
        <option value="">Tutti i consulenti</option>
        {staff.map((o) => <option key={o.id} value={o.id}>{o.nome} {o.cognome ?? ''}</option>)}
      </select>
      {children}
      <button className="bottone secondario" type="submit">Filtra</button>
    </form>
  )
}

// Il consulente dai parametri della pagina, solo se e' uno degli operatori.
export const consulenteScelto = (staff: Operatore[], id: string | undefined) =>
  staff.some((o) => o.id === id) ? id! : null
