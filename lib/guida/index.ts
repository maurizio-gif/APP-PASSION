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
import { curriculum } from './curriculum'
import { abbonamenti } from './abbonamenti'
import { accessi } from './accessi'
import { glossario } from './glossario'
import { risposteRapide } from './risposte-rapide'

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

// L'ordine e' quello dell'elenco della Guida e dei pulsanti «precedente» e «successivo».
export const ARGOMENTI: Argomento[] = [
  primiPassi,
  glossario,
  risposteRapide,
  lead,
  prove,
  rinnovi,
  disdette,
  debitori,
  schedaPersona,
  task,
  ticket,
  abbonamenti,
  curriculum,
  accessi,
]

// Come la Guida raggruppa gli argomenti (solo presentazione: un argomento che
// non e' in nessun gruppo finisce in fondo, sotto «Altro»).
const GRUPPI: { titolo: string; chiavi: string[] }[] = [
  { titolo: 'Per cominciare', chiavi: ['primi-passi', 'glossario', 'risposte-rapide'] },
  { titolo: 'Clienti e vendite', chiavi: ['lead', 'prove', 'rinnovi', 'disdette', 'debitori', 'scheda-persona'] },
  { titolo: 'Il lavoro di ogni giorno', chiavi: ['task', 'ticket'] },
  { titolo: 'Numeri, candidature e accessi', chiavi: ['abbonamenti', 'curriculum', 'accessi'] },
]

export function raggruppa(argomenti: Argomento[]): { titolo: string; voci: Argomento[] }[] {
  const usate = new Set(GRUPPI.flatMap((g) => g.chiavi))
  return [
    ...GRUPPI.map((g) => ({ titolo: g.titolo, voci: g.chiavi.flatMap((k) => argomenti.filter((a) => a.chiave === k)) })),
    { titolo: 'Altro', voci: argomenti.filter((a) => !usate.has(a.chiave)) },
  ].filter((g) => g.voci.length > 0)
}

export const argomentiPer = (io: Io) => ARGOMENTI.filter((a) => a.sezione === null || puoVedere(io, a.sezione))
