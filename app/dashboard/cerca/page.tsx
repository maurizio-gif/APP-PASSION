import Link from 'next/link'
import { crm } from '@/lib/crm'
import { formatoFa } from '@/lib/formato'
import { Contatti, Persona, Vuoto } from '@/components/Ui'

export default async function Cerca({ searchParams }: { searchParams: { q?: string } }) {
  const q = searchParams.q?.trim().slice(0, 80) ?? ''
  const trovati = q.length >= 2 ? await crm.cerca(q) : []

  return (
    <>
      <div className="testata">
        <div>
          <h1>Cerca</h1>
          <p>Soci, lead e prove: per nome, cognome, telefono o email.</p>
        </div>
        <Link className="bottone" href="/dashboard/lead/nuovo">+ Nuovo lead</Link>
      </div>

      <form className="filtri" action="/dashboard/cerca">
        <input type="search" name="q" defaultValue={q} placeholder="Nome, cognome, telefono, email" autoFocus />
        <button className="bottone secondario" type="submit">Cerca</button>
      </form>

      <div className="scheda">
        {q.length < 2 ? (
          <Vuoto>Scrivi almeno due lettere.</Vuoto>
        ) : trovati.length === 0 ? (
          <Vuoto>Nessuno trovato per «{q}». Se è una persona nuova, crea un lead.</Vuoto>
        ) : (
          <ul className="elenco">
            {trovati.map((t) => (
              <li key={t.id}>
                <div className="elenco-riga">
                  <div>
                    <Persona id={t.id} nome={t.nome} cognome={t.cognome} />{' '}
                    {t.member_id && <span className="bollino verde">socio</span>}{' '}
                    {t.lead_aperti > 0 && <span className="bollino giallo">{t.lead_aperti} lead aperti</span>}
                    <Contatti telefono={t.telefono} email={t.email} />
                  </div>
                  <span className="piccolo attenuato">{t.ultima_attivita ? formatoFa(t.ultima_attivita) : ''}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
