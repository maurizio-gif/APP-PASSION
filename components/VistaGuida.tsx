import Link from 'next/link'
import type { Argomento } from '@/lib/guida'
import { capitoli, TestoGuida } from './TestoGuida'

// La Guida, disegnata: l'elenco degli argomenti e la pagina di un argomento.
// Riceve gli argomenti gia' scelti (app/dashboard/guida) e i link: non decide
// niente su chi vede cosa.

export function IndiceGuida({ gruppi, href }: { gruppi: { titolo: string; voci: Argomento[] }[]; href: (chiave: string) => string }) {
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
      {gruppi.map((g) => (
        <section key={g.titolo} className="gd-gruppo">
          <h2 className="gd-gruppo-titolo">
            {g.titolo}
            <span>{g.voci.length} {g.voci.length === 1 ? 'argomento' : 'argomenti'}</span>
          </h2>
          <div className="gd-griglia">
            {g.voci.map((a) => {
              const cap = capitoli(a.testo)
              return (
                <Link key={a.chiave} href={href(a.chiave)} className="gd-voce">
                  <span className="gd-voce-testa">
                    <strong>{a.titolo}</strong>
                    {cap.length > 0 && <span>{cap.length} {cap.length === 1 ? 'capitolo' : 'capitoli'}</span>}
                  </span>
                  <span className="gd-voce-corpo">
                    <span className="gd-voce-breve">{a.inBreve}</span>
                    {cap.length > 0 && (
                      <span className="gd-voce-capitoli">
                        {cap.map((c) => <span key={c.id}>{c.titolo}</span>)}
                      </span>
                    )}
                  </span>
                  <span className="gd-voce-piede">Leggi<i aria-hidden="true" /></span>
                </Link>
              )
            })}
          </div>
        </section>
      ))}
    </>
  )
}

export function PaginaGuida({ a, testo, prima, dopo, href, hrefGuida, sezione }: {
  a: Argomento
  testo: string
  prima?: Argomento
  dopo?: Argomento
  href: (chiave: string) => string
  hrefGuida: string
  sezione?: { href: string; testo: string }
}) {
  const indice = capitoli(testo)
  return (
    <>
      <div className="testata">
        <div>
          <div className="titolo-riga">
            <h1>{a.titolo}</h1>
            <span className="aiuto-titolo" tabIndex={0} role="note" aria-label="Cos'è questa sezione">
              <span className="aiuto-punto" aria-hidden="true">?</span>
              <span className="aiuto-testo">{a.inBreve}</span>
            </span>
          </div>
        </div>
        <div className="azioni-riga gd-azioni">
          <Link className="gd-bottone" href={hrefGuida}>Tutta la guida</Link>
          {sezione && <Link className="gd-bottone pieno" href={sezione.href}>Vai a {sezione.testo}</Link>}
        </div>
      </div>

      <div className={`gd-pagina${indice.length > 1 ? '' : ' senza-indice'}`}>
        {indice.length > 1 && (
          <nav className="gd-indice" aria-label="In questa pagina">
            <div className="gd-indice-titolo">In questa pagina</div>
            <ol>
              {indice.map((c) => <li key={c.id}><a href={`#${c.id}`}>{c.titolo}</a></li>)}
            </ol>
          </nav>
        )}
        <article className="gd-articolo">
          <p className="gd-in-breve">{a.inBreve}</p>
          <TestoGuida testo={testo} />
        </article>
      </div>

      <nav className="gd-piede" aria-label="Altri argomenti">
        {prima ? (
          <Link className="gd-passo" href={href(prima.chiave)}>
            <small>Precedente</small>
            <strong>{prima.titolo}</strong>
          </Link>
        ) : <span />}
        {dopo ? (
          <Link className="gd-passo dopo" href={href(dopo.chiave)}>
            <small>Successivo</small>
            <strong>{dopo.titolo}</strong>
          </Link>
        ) : <span />}
      </nav>
    </>
  )
}
