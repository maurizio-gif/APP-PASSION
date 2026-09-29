import type { Operatore } from '@/lib/crm'

// La tendina «Assegnata a» di prove e disdette: gli operatori che ricevono
// lead e task. Chi la segue gia' ma non e' fra loro (un admin, uno spento)
// resta scelto, con il suo nome; «Da assegnare» lascia com'e'.
export function SceltaOperatore({ staff, attuale, attualeNome, etichetta = 'Assegnata a' }: {
  staff: Operatore[]
  attuale: string | null | undefined
  attualeNome?: string | null
  etichetta?: string
}) {
  const fuori = attuale && !staff.some((o) => o.id === attuale)
  return (
    <select name="assegnato" defaultValue={attuale ?? ''} aria-label={etichetta}>
      <option value="">{etichetta}…</option>
      {fuori && <option value={attuale}>{attualeNome ?? 'Operatore'}</option>}
      {staff.map((o) => <option key={o.id} value={o.id}>{o.nome} {o.cognome ?? ''}</option>)}
    </select>
  )
}
