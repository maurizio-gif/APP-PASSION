import { crm } from '@/lib/crm'
import { VistaAbbonamenti } from '@/components/VistaAbbonamenti'

// La dashboard abbonamenti: quanti sono, quanti ne entrano, quanti ne escono e
// quanto restano. Tutto dal mirror di PerfectGym; le regole (cos'e' un
// abbonamento, un rinnovo, uno scaduto) stanno nel database, in
// supabase/migrations/20260928p_dashboard_abbonamenti.sql.
export default async function DashboardAbbonamenti() {
  return <VistaAbbonamenti d={await crm.abbonamenti()} />
}
