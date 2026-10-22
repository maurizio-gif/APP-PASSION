import { redirect } from 'next/navigation'
import { crm } from '@/lib/crm'
import { argomentiPer } from '@/lib/guida'
import { SEZIONI } from '@/lib/permessi'
import { PaginaGuida } from '@/components/VistaGuida'

// Un argomento della guida, con l'indice dei capitoli e il passaggio al
// precedente e al successivo. Chi non vede la sezione torna all'elenco.
export default async function ArgomentoGuida({ params }: { params: { argomento: string } }) {
  const io = await crm.io()
  const argomenti = argomentiPer(io)
  const i = argomenti.findIndex((a) => a.chiave === params.argomento)
  if (i < 0) redirect('/dashboard/guida')
  const a = argomenti[i]
  const sezione = SEZIONI.find((s) => s.chiave === a.sezione)

  return (
    <PaginaGuida
      a={a}
      testo={a.testo}
      prima={argomenti[i - 1]}
      dopo={argomenti[i + 1]}
      href={(k) => `/dashboard/guida/${k}`}
      hrefGuida="/dashboard/guida"
      sezione={sezione && { href: sezione.href, testo: sezione.testo }}
    />
  )
}
