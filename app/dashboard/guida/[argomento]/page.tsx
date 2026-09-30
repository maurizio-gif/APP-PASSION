import Link from 'next/link'
import { redirect } from 'next/navigation'
import { crm } from '@/lib/crm'
import { argomentiPer } from '@/lib/guida'
import { SEZIONI } from '@/lib/permessi'
import { capitoli, TestoGuida } from '@/components/TestoGuida'

// Un argomento della guida, con l'indice dei capitoli e il passaggio al
// precedente e al successivo. Chi non vede la sezione torna all'elenco.
export default async function ArgomentoGuida({ params }: { params: { argomento: string } }) {
  const io = await crm.io()
  const argomenti = argomentiPer(io)
  const i = argomenti.findIndex((a) => a.chiave === params.argomento)
  if (i < 0) redirect('/dashboard/guida')
  const a = argomenti[i]
  const sezione = SEZIONI.find((s) => s.chiave === a.sezione)
  const indice = capitoli(a.testo)
  const prima = argomenti[i - 1]
  const dopo = argomenti[i + 1]

  return (
    <>
      <div className="testata">
        <div>
          <h1>{a.titolo}</h1>
          <p>{a.inBreve}</p>
        </div>
        <div className="azioni-riga">
          <Link href="/dashboard/guida">← Guida</Link>
          {sezione && <Link className="bottone secondario" href={sezione.href}>Vai a {sezione.testo}</Link>}
        </div>
      </div>
      <div className="guida">
        {indice.length > 1 && (
          <nav className="scheda guida-indice" aria-label="In questa pagina">
            <div className="piccolo attenuato">In questa pagina</div>
            <ul className="elenco-breve">
              {indice.map((c) => <li key={c.id}><a href={`#${c.id}`}>{c.titolo}</a></li>)}
            </ul>
          </nav>
        )}
        <article className="scheda">
          <TestoGuida testo={a.testo} />
        </article>
      </div>
      <nav className="guida-piede">
        {prima ? <Link href={`/dashboard/guida/${prima.chiave}`}>← {prima.titolo}</Link> : <span />}
        {dopo && <Link href={`/dashboard/guida/${dopo.chiave}`}>{dopo.titolo} →</Link>}
      </nav>
    </>
  )
}
