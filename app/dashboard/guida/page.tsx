import Link from 'next/link'
import { crm } from '@/lib/crm'
import { argomentiPer, raggruppa } from '@/lib/guida'
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
          <div className="titolo-riga">
            <h1>Guida</h1>
            <span className="aiuto-titolo" tabIndex={0} role="note" aria-label="Cos'è questa sezione">
              <span className="aiuto-punto" aria-hidden="true">?</span>
              <span className="aiuto-testo">Come si usa il CRM: cosa trovi in ogni sezione, cosa fare e cosa fa il CRM da solo.
            In ogni sezione, «Come funziona» apre il suo capitolo senza lasciare la pagina.</span>
            </span>
          </div>
        </div>
      </div>
      {raggruppa(argomenti).map((g) => (
        <section key={g.titolo} className="guida-gruppo">
          <h2 className="guida-gruppo-titolo">{g.titolo}</h2>
          <div className="griglia">
            {g.voci.map((a) => (
              <Link key={a.chiave} href={`/dashboard/guida/${a.chiave}`} className="scheda guida-voce">
                <h2>{a.titolo}</h2>
                <p>{a.inBreve}</p>
                <ul className="elenco-breve piccolo attenuato">
                  {capitoli(a.testo).map((c) => <li key={c.id}>{c.titolo}</li>)}
                </ul>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </>
  )
}
