import Link from 'next/link'
import { crm, richiediSezione } from '@/lib/crm'
import { formatoFa } from '@/lib/formato'
import { Contatti, Persona, Vuoto } from '@/components/Ui'

export default async function Cerca({ searchParams }: { searchParams: { q?: string } }) {
  await richiediSezione('cerca')
  const q = searchParams.q?.trim().slice(0, 80) ?? ''
  const trovati = q.length >= 2 ? await crm.cerca(q) : []

  return (
    <>
      <div className="testata">
        <div>
          <div className="titolo-riga">
            <h1>Cerca</h1>
            <span className="aiuto-titolo" tabIndex={0} role="note" aria-label="Cos'è questa sezione">
              <span className="aiuto-punto" aria-hidden="true">?</span>
              <span className="aiuto-testo">Soci, lead e prove: per nome, cognome, telefono o email.</span>
            </span>
          </div>
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
          <div className="tabella-scorre">
            <table className="schede-mobile tabella-colonne">
              <thead>
                <tr>
                  <th>Persona</th>
                  <th>Stato</th>
                  <th>Ultima attività</th>
                </tr>
              </thead>
              <tbody>
                {trovati.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <div className="riga-dati">
                        <Persona id={t.id} nome={t.nome} cognome={t.cognome} />
                        <Contatti telefono={t.telefono} email={t.email} />
                      </div>
                    </td>
                    <td>
                      <div className="riga-dati">
                        {t.member_id && <span className="etichetta-riga"><span className="bollino verde">socio</span></span>}
                        {t.lead_aperti > 0 && <span className="etichetta-riga"><span className="bollino giallo">{t.lead_aperti} lead aperti</span></span>}
                      </div>
                    </td>
                    <td><div className="riga-dati"><span className="muto">{t.ultima_attivita ? formatoFa(t.ultima_attivita) : ''}</span></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
