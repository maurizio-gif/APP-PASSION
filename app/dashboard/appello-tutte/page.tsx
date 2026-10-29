import { crm, richiediSezione } from '@/lib/crm'
import { eGiornoValido, oggiRoma } from '@/lib/formato'
import { VistaAppelloTutte } from '@/components/VistaAppello'

type Filtri = { giorno?: string; istruttore?: string; lezione?: string; categoria?: string; sala?: string }
const numero = (v: string | undefined) => (v && /^\d+$/.test(v) ? Number(v) : null)

// L'Appello complessivo: tutte le lezioni di un giorno, di tutti gli
// istruttori, con chi ha prenotato e chi e' presente. Si filtra per istruttore,
// lezione, categoria e sala. Solo da leggere: la presenza la segna l'istruttore
// dal suo appello. Lo vedono gli admin e i consulenti. Le regole stanno nel
// database (supabase/migrations/20261027i_appello.sql); la pagina e' in
// components/VistaAppello.tsx.
export default async function AppelloTutte({ searchParams }: { searchParams: Filtri }) {
  await richiediSezione('appello_tutte')
  const oggi = oggiRoma()
  const giorno = eGiornoValido(searchParams.giorno) ? searchParams.giorno : oggi
  const filtri = { istruttore: numero(searchParams.istruttore), lezione: numero(searchParams.lezione), categoria: numero(searchParams.categoria), sala: numero(searchParams.sala) }
  const r = await crm.appelloTutte(giorno, filtri)
  return <VistaAppelloTutte r={r} giorno={giorno} oggi={oggi} filtri={filtri} base="/dashboard/appello-tutte" />
}
