import { crm, richiediSezione } from '@/lib/crm'
import { Avviso, SchedeMulti, Vuoto } from '@/components/Ui'
import { TabellaAzioniIstruttori } from '@/components/TabellaAzioniIstruttori'

const CHI = [
  { chiave: 'mie', testo: 'Le mie' },
  { chiave: 'libere', testo: 'Libere da prendere' },
  { chiave: 'tutte', testo: 'Di tutti' },
]
const QUANDO = [
  { chiave: 'da_fare', testo: 'Da fare' },
  { chiave: 'fatte', testo: 'Fatte' },
]

// Le azioni degli istruttori del cluster «Istruttori · nuovi iscritti» (20261110a). Le crea da sole
// un'automazione, con le regole di «Impostazioni automazioni» (giorni, abbonamento, lezioni). Nascono
// libere: l'istruttore se le assegna con «Prendi in carico», chiama o scrive, e chiude con come e' andata.
export default async function AzioniIstruttori({ searchParams }: { searchParams: { chi?: string; quando?: string; errore?: string } }) {
  const io = await richiediSezione('azioni_istruttori')
  const chi = CHI.some((v) => v.chiave === searchParams.chi) ? searchParams.chi! : 'mie'
  const quando = QUANDO.some((v) => v.chiave === searchParams.quando) ? searchParams.quando! : 'da_fare'
  const [numeri, azioni] = await Promise.all([crm.numeriAzioniIstruttori(), crm.azioniIstruttori(chi, quando)])
  const qui = `/dashboard/azioni-istruttori?chi=${chi}&quando=${quando}`
  const n = (k: string) => (k === 'mie' ? numeri.mie_da_fare : k === 'libere' ? numeri.libere : undefined)

  return (
    <>
      <div className="testata">
        <div>
          <div className="titolo-riga">
            <h1>Azioni istruttore</h1>
            <span className="aiuto-titolo" tabIndex={0} role="note" aria-label="Cos'è questa sezione">
              <span className="aiuto-punto" aria-hidden="true">?</span>
              <span className="aiuto-testo">
                Le persone da contattare per dare il benvenuto ai nuovi iscritti, scelte da sole con le regole di «Impostazioni automazioni».
                Prendi in carico quelle che vuoi seguire, poi chiudile dicendo com’è andata.
              </span>
            </span>
          </div>
        </div>
      </div>
      <Avviso errore={searchParams.errore} />
      <div className="schede-gruppi">
        <div className="schede-gruppo tono-lavoro">
          <span className="gruppo-etichetta">Oggi</span>
          <div className="schede-vista">
            <span className="muto">
              {numeri.mie_da_fare} da fare, di cui {numeri.mie_in_ritardo} in ritardo · {numeri.libere} libere · {numeri.fatte_settimana} fatte negli ultimi 7 giorni
            </span>
          </div>
        </div>
      </div>
      <SchedeMulti gruppi={[
        { testo: 'Di chi', tono: 'lavoro', voci: CHI.map((v) => ({ testo: v.testo, href: `/dashboard/azioni-istruttori?chi=${v.chiave}&quando=${quando}`, attivo: v.chiave === chi, n: quando === 'da_fare' ? n(v.chiave) : undefined })) },
        { testo: 'Stato', tono: 'prova', voci: QUANDO.map((v) => ({ testo: v.testo, href: `/dashboard/azioni-istruttori?chi=${chi}&quando=${v.chiave}`, attivo: v.chiave === quando })) },
      ]} />

      <div className="scheda">
        {azioni.length === 0 ? (
          <Vuoto>{quando === 'fatte' ? 'Ancora nessuna azione chiusa.' : chi === 'mie' ? 'Non hai azioni in carico. Guarda fra le libere da prendere.' : 'Nessuna azione qui.'}</Vuoto>
        ) : (
          <TabellaAzioniIstruttori azioni={azioni} io={io} torna={qui} />
        )}
      </div>
    </>
  )
}
