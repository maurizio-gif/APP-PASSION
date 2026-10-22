import { crm } from '@/lib/crm'
import { argomentiPer, raggruppa } from '@/lib/guida'
import { IndiceGuida } from '@/components/VistaGuida'

// La guida: un argomento per ogni pezzo del lavoro, solo quelli delle sezioni
// che chi e' entrato vede.
export default async function Guida() {
  const io = await crm.io()
  const argomenti = argomentiPer(io)

  return <IndiceGuida gruppi={raggruppa(argomenti)} href={(k) => `/dashboard/guida/${k}`} />
}
