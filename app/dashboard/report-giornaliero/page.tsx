import { redirect } from 'next/navigation'
import { crm } from '@/lib/crm'
import { eGiornoValido, oggiRoma } from '@/lib/formato'
import { eAdmin } from '@/lib/permessi'
import { consulenteScelto } from '@/components/FiltroConsulente'
import { GRUPPI, VistaReportGiornaliero } from '@/components/VistaReportGiornaliero'

// Il report giornaliero: tutto quello che e' successo in un giorno, dal lead
// che arriva all'abbonamento. Solo admin: il database fa lo stesso controllo
// (supabase/migrations/20261027c_report_giornaliero.sql).
export default async function ReportGiornaliero({ searchParams }: { searchParams: { giorno?: string; consulente?: string; tipo?: string } }) {
  const io = await crm.io()
  if (!eAdmin(io)) redirect(`/dashboard?errore=${encodeURIComponent('Il report giornaliero lo vedono solo gli admin.')}`)

  const oggi = oggiRoma()
  // Mai un giorno nel futuro: non c'e' niente da leggere.
  const giorno = eGiornoValido(searchParams.giorno) && searchParams.giorno <= oggi ? searchParams.giorno : oggi
  const staff = await crm.staff()
  const consulente = consulenteScelto(staff, searchParams.consulente)
  const gruppo = GRUPPI.find((g) => g.chiave === searchParams.tipo)?.chiave ?? null
  const report = await crm.reportGiornaliero(giorno, consulente)

  return <VistaReportGiornaliero report={report} oggi={oggi} staff={staff} consulente={consulente} gruppo={gruppo} />
}
