import { crm, richiediSezione } from '@/lib/crm'
import { eGiornoValido, oggiRoma } from '@/lib/formato'
import { VistaAppello } from '@/components/VistaAppello'

// L'Appello istruttore: le lezioni di chi guarda e i loro prenotati, di oggi e
// dei prossimi giorni. Le presenze si segnano da 59 minuti prima dell'inizio a
// 59 minuti dopo la fine della lezione; prima e dopo si legge e basta. Chi e'
// l'istruttore lo dice la stessa email su PerfectGym; le regole stanno nel
// database (supabase/migrations/20261027i_appello.sql). Tutte le lezioni di
// tutti stanno in «Appello complessivo». La pagina e' in components/VistaAppello.tsx.
export default async function Appello({ searchParams }: { searchParams: { giorno?: string } }) {
  await richiediSezione('appello')
  const oggi = oggiRoma()
  // Senza un giorno: oggi e i prossimi sei. Con un giorno (anche passato): quel giorno.
  const singolo = eGiornoValido(searchParams.giorno) ? searchParams.giorno : null
  const a = await crm.appello(singolo, singolo ? 1 : 7)
  return <VistaAppello a={a} singolo={singolo} oggi={oggi} base="/dashboard/appello" />
}
