import { crm, richiediSezione } from '@/lib/crm'
import type { ChiaveListaNewsletter } from '@/lib/crm'
import { SchedeMulti } from '@/components/Ui'

// Le liste di persone per le newsletter (20261111c): sempre calcolate sui dati di Perfect Gym, da scaricare
// in CSV con la sola colonna UserNumber, il formato che Perfect Gym legge per le campagne.
const LISTE: { chiave: ChiaveListaNewsletter; nome: string; chi: string }[] = [
  { chiave: 'tutto', nome: 'Tutto il database', chi: 'Tutte le persone: soci, ex soci, lead e guest.' },
  { chiave: 'attivi', nome: 'Attivi (tutti)', chi: 'Chi ha un abbonamento in corso di qualunque tipo: soci, Wellhub, Fitprime, Employee e Pass. Per le comunicazioni di servizio.' },
  { chiave: 'soci', nome: 'Soci', chi: 'Chi ha un abbonamento vero in corso. Niente Wellhub, Fitprime, Employee e Pass. Per le attività referral.' },
  { chiave: 'terminati', nome: 'Terminati', chi: 'Ex soci senza più nessun abbonamento in corso, e chi ha fatto un Guest Pass finito senza poi abbonarsi.' },
  { chiave: 'lead', nome: 'Lead', chi: 'Le persone registrate come lead che non sono diventate socie.' },
  { chiave: 'guest_pass_attivi', nome: 'Guest Pass attivi', chi: 'Chi ha un Guest Pass in corso adesso.' },
]
// Con il punto delle migliaia sempre (anche per i numeri a 4 cifre).
const numero = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')

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

      <div className="liste-news">
        {LISTE.map((l, i) => {
          const n = numeri.find((x) => x.chiave === l.chiave)
          const tutti = n?.tutti ?? 0
          const conConsenso = n?.con_consenso ?? 0
          const scaricabili = soloConsenso ? conConsenso : tutti
          const perc = tutti > 0 ? Math.round((conConsenso * 100) / tutti) : 0
          return (
            <section className={`lista-news${i === 0 ? ' prima' : ''}`} key={l.chiave}>
              <div className="lista-news-nome">{l.nome}</div>
              <div className="lista-news-numero">
                {numero(scaricabili)}
                <small>persone</small>
              </div>
              <div className="lista-news-barra" role="img" aria-label={`${perc}% con consenso marketing`}>
                <span style={{ width: `${perc}%` }} />
              </div>
              <div className="lista-news-sotto">
                {soloConsenso
                  ? `su ${numero(tutti)} con email · consenso marketing ${perc}%`
                  : `${numero(conConsenso)} con consenso marketing (${perc}%)`}
              </div>
              <div className="lista-news-chi">{l.chi}</div>
              {scaricabili > 0 ? (
                <a className="bottone" href={`/dashboard/liste-newsletter/${l.chiave}${soloConsenso ? '?consenso=1' : ''}`} download>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" /></svg>
                  Scarica CSV
                </a>
              ) : (
                <span className="lista-news-vuota">Lista vuota</span>
              )}
            </section>
          )
        })}
      </div>

      <p className="piccolo attenuato">
        Nei file ci sono solo le persone con un’email valida. «In corso» vuol dire un abbonamento attivo, in pausa o non ancora partito, con la fine non passata.
        Una persona può stare in più liste (per esempio un socio sta in «Attivi» e in «Soci»), mentre «Attivi» e «Terminati» non si sovrappongono mai.
        Chi non ha mai risposto al consenso marketing conta come «senza consenso».
      </p>
    </>
  )
}
