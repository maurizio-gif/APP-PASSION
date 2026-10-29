import { crm, richiediSezione } from '@/lib/crm'
import { VISTE, VistaContratti } from '@/components/VistaContratti'

// I contratti senza consulente: gli abbonamenti nuovi che nessuna opportunità
// ha portato («in prima battuta»: la persona si iscrive e basta). Il consulente
// di PerfectGym non si usa: si prendono in carico da qui, come le disdette, e
// serve una nota. Le regole (cosa è «nuovo», chi può riassegnare) stanno nel
// database, in supabase/migrations/20261027g_contratti_senza_consulente.sql.
export default async function ContrattiSenzaConsulente({ searchParams }: { searchParams: { vista?: string; errore?: string } }) {
  await richiediSezione('lead')
  const vista = VISTE.some((v) => v.chiave === searchParams.vista) ? searchParams.vista! : 'da_assegnare'
  const [righe, io, staff] = await Promise.all([crm.iscrizioni(vista), crm.io(), crm.staff()])
  return <VistaContratti righe={righe} io={io} staff={staff} vista={vista} base="/dashboard/contratti-senza-consulente" errore={searchParams.errore} />
}
