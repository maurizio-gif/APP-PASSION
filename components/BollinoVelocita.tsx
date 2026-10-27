import type { Velocita } from '@/lib/crm'
import { ORARIO_LAVORO, coloreVelocita, tempoLavoro } from '@/lib/velocita'

// La velocita' del primo ricontatto di un'opportunita': in quanto tempo di
// lavoro e' stata ricontattata (anche con un tentativo), o da quanto aspetta.
// Una chiusa senza nessun ricontatto (la vincita l'ha segnata PerfectGym) non
// ha niente da misurare.
export function BollinoVelocita({ v, chiusa = false }: { v: Velocita | undefined; chiusa?: boolean }) {
  if (!v) return null
  if (!v.primo_contatto && chiusa) return <span className="attenuato" title="Chiusa senza nessun ricontatto">—</span>
  const colore = coloreVelocita(v.minuti)
  return (
    <span className={`bollino ${colore}`} title={`Tempo di lavoro dall’arrivo. ${ORARIO_LAVORO}`}>
      {v.primo_contatto ? `Ricontattata in ${tempoLavoro(v.minuti)}` : `In attesa da ${tempoLavoro(v.minuti)}`}
    </span>
  )
}
