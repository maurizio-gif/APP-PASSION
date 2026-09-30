import type { Io } from '@/lib/crm'
import { puoVedere, type Sezione } from '@/lib/permessi'
import { primiPassi } from './primi-passi'
import { lead } from './lead'
import { prove } from './prove'
import { rinnovi } from './rinnovi'
import { disdette } from './disdette'
import { debitori } from './debitori'
import { task } from './task'
import { schedaPersona } from './scheda-persona'
import { ticket } from './ticket'
import { abbonamenti } from './abbonamenti'
import { accessi } from './accessi'

// La guida del CRM: come si usa, sezione per sezione, e cosa fa il CRM da
// solo. Un argomento per file; il testo e' il Markdown ridotto di
// components/TestoGuida.tsx. Quando una regola del CRM cambia, si corregge
// qui nella stessa PR: la guida deve dire quello che l'app fa davvero.
export type Argomento = {
  chiave: string
  titolo: string
  // La sezione di cui parla: l'argomento lo vede chi vede la sezione, e dalla
  // sezione si arriva qui con «Come funziona». null: lo vedono tutti.
  sezione: Sezione | null
  inBreve: string
  testo: string
}

export const ARGOMENTI: Argomento[] = [
  primiPassi,
  lead,
  prove,
  rinnovi,
  disdette,
  debitori,
  task,
  schedaPersona,
  ticket,
  abbonamenti,
  accessi,
]

export const argomentiPer = (io: Io) => ARGOMENTI.filter((a) => a.sezione === null || puoVedere(io, a.sezione))
