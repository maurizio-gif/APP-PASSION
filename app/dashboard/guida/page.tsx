import Link from 'next/link'
import { crm } from '@/lib/crm'
import { argomentiPer } from '@/lib/guida'
import { capitoli } from '@/components/TestoGuida'

// La guida: un argomento per ogni pezzo del lavoro, solo quelli delle sezioni
// che chi e' entrato vede.
export default async function Guida() {
  const io = await crm.io()
  const argomenti = argomentiPer(io)

  return (
    <>
      <div className="testata">
        <div>
          <h1>Guida</h1>
          <p>Come si usa il CRM: cosa trovi in ogni sezione, cosa fare e cosa fa il CRM da solo.
            In ogni sezione, «Come funziona» apre il suo capitolo senza lasciare la pagina.</p>
        </div>
      </div>
      <div className="griglia">
        {argomenti.map((a) => (
          <Link key={a.chiave} href={`/dashboard/guida/${a.chiave}`} className="scheda guida-voce">
            <h2>{a.titolo}</h2>
            <p>{a.inBreve}</p>
            <ul className="elenco-breve piccolo attenuato">
              {capitoli(a.testo).map((c) => <li key={c.id}>{c.titolo}</li>)}
            </ul>
          </Link>
        ))}
      </div>
    </>
  )
}
