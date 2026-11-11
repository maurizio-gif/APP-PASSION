import { crm, richiediSezione } from '@/lib/crm'
import type { ChiaveListaNewsletter } from '@/lib/crm'
import { SchedeMulti } from '@/components/Ui'

// Le liste di persone per le newsletter (20261111c): sempre calcolate sui dati di Perfect Gym, da scaricare
// in CSV con la sola colonna UserNumber, il formato che Perfect Gym legge per le campagne.
const LISTE: { chiave: ChiaveListaNewsletter; nome: string; chi: string }[] = [
  { chiave: 'attivi', nome: 'Attivi (tutti)', chi: 'Chi ha un abbonamento in corso di qualunque tipo: soci, Wellhub, Fitprime, Employee e Pass. Per le comunicazioni di servizio.' },
  { chiave: 'soci', nome: 'Soci', chi: 'Chi ha un abbonamento vero in corso. Niente Wellhub, Fitprime, Employee e Pass. Per le attività referral.' },
  { chiave: 'terminati', nome: 'Terminati', chi: 'Ex soci senza più nessun abbonamento in corso, e chi ha fatto un Guest Pass finito senza poi abbonarsi.' },
  { chiave: 'lead', nome: 'Lead', chi: 'Le persone registrate come lead che non sono diventate socie.' },
  { chiave: 'guest_pass_attivi', nome: 'Guest Pass attivi', chi: 'Chi ha un Guest Pass in corso adesso.' },
  { chiave: 'tutto', nome: 'Tutto il database', chi: 'Tutte le persone: soci, ex soci, lead e guest.' },
]
const numero = (n: number) => n.toLocaleString('it-IT')

export default async function ListeNewsletter({ searchParams }: { searchParams: { consenso?: string } }) {
  await richiediSezione('liste_newsletter')
  const soloConsenso = searchParams.consenso === '1'
  const numeri = await crm.listeNewsletter()

  return (
    <>
      <div className="testata">
        <div>
          <div className="titolo-riga">
            <h1>Liste newsletter</h1>
            <span className="aiuto-titolo" tabIndex={0} role="note" aria-label="Cos'è questa sezione">
              <span className="aiuto-punto" aria-hidden="true">?</span>
              <span className="aiuto-testo">
                Liste di persone per le campagne email. Si aggiornano da sole con i dati di Perfect Gym. Il file scaricato ha una sola colonna, UserNumber:
                si carica su Perfect Gym come CSV.
              </span>
            </span>
          </div>
        </div>
      </div>

      <SchedeMulti gruppi={[
        {
          testo: 'Cosa scaricare',
          tono: 'lavoro',
          voci: [
            { testo: 'Tutti', href: '/dashboard/liste-newsletter', attivo: !soloConsenso },
            { testo: 'Solo chi ha dato il consenso marketing', href: '/dashboard/liste-newsletter?consenso=1', attivo: soloConsenso },
          ],
        },
      ]} />

      <section className="scheda">
        <div className="tabella-scorre">
          <table className="schede-mobile tabella-colonne tabella-uniforme">
            <thead>
              <tr>
                <th>Lista</th>
                <th>Persone</th>
                <th>{soloConsenso ? 'Tutte (con email)' : 'Con consenso marketing'}</th>
                <th>File</th>
              </tr>
            </thead>
            <tbody>
              {LISTE.map((l) => {
                const n = numeri.find((x) => x.chiave === l.chiave)
                const tutti = n?.tutti ?? 0
                const conConsenso = n?.con_consenso ?? 0
                const scaricabili = soloConsenso ? conConsenso : tutti
                return (
                  <tr key={l.chiave}>
                    <td>
                      <div className="riga-dati">
                        <strong>{l.nome}</strong>
                        <span className="muto">{l.chi}</span>
                      </div>
                    </td>
                    <td><div className="riga-dati"><strong>{numero(scaricabili)}</strong></div></td>
                    <td><span className="muto">{numero(soloConsenso ? tutti : conConsenso)}</span></td>
                    <td>
                      {scaricabili > 0 ? (
                        <a className="bottone piccolo" href={`/dashboard/liste-newsletter/${l.chiave}${soloConsenso ? '?consenso=1' : ''}`} download>
                          Scarica CSV
                        </a>
                      ) : (
                        <span className="muto">Lista vuota</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <p className="piccolo attenuato">
        Nei file ci sono solo le persone con un’email valida. «In corso» vuol dire un abbonamento attivo, in pausa o non ancora partito, con la fine non passata.
        Una persona può stare in più liste (per esempio un socio sta in «Attivi» e in «Soci»), mentre «Attivi» e «Terminati» non si sovrappongono mai.
        Chi non ha mai risposto al consenso marketing conta come «senza consenso».
      </p>
    </>
  )
}
