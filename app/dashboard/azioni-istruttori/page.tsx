import { crm, richiediSezione } from '@/lib/crm'
import { Avviso, SchedeMulti, Vuoto } from '@/components/Ui'
import { TabellaAzioniIstruttori } from '@/components/TabellaAzioniIstruttori'

const LISTE = [
  { chiave: 'benvenuto', testo: 'Nuovi iscritti' },
  { chiave: 'recupero', testo: 'Recupero Formula 8' },
] as const
const CHI = [
  { chiave: 'mie', testo: 'Le mie' },
  { chiave: 'libere', testo: 'Libere da prendere' },
  { chiave: 'tutte', testo: 'Di tutti' },
]
const QUANDO = [
  { chiave: 'da_fare', testo: 'Da fare' },
  { chiave: 'fatte', testo: 'Fatte' },
]
const MOSTRATE = 300

// Le azioni degli istruttori del cluster «Istruttori · nuovi iscritti» (20261110a). Due contenitori separati,
// con la stessa logica (libere da prendere, le mie, di tutti; «Prendi in carico»; gli stessi esiti):
//   - Nuovi iscritti: le crea da sole un'automazione, 7 giorni dopo l'iscrizione (regole in «Impostazioni automazioni»);
//   - Recupero Formula 8 (20261110c/d): lista FISSA, creata una volta, degli iscritti di prima con un abbonamento
//     attivo (contratto Current) che non hanno mai prenotato Formula 8, da smaltire un po' alla volta. I nuovi
//     iscritti non ci arrivano: vanno in «Nuovi iscritti».
export default async function AzioniIstruttori({ searchParams }: { searchParams: { lista?: string; chi?: string; quando?: string; q?: string; errore?: string } }) {
  const io = await richiediSezione('azioni_istruttori')
  const lista = searchParams.lista === 'recupero' ? 'recupero' : 'benvenuto'
  const chi = CHI.some((v) => v.chiave === searchParams.chi) ? searchParams.chi! : lista === 'recupero' ? 'libere' : 'mie'
  const quando = QUANDO.some((v) => v.chiave === searchParams.quando) ? searchParams.quando! : 'da_fare'
  const q = searchParams.q?.trim().slice(0, 80) || ''
  const [numeri, azioni] = await Promise.all([crm.numeriAzioniIstruttori(), crm.azioniIstruttori(chi, quando, lista, q || null)])
  const perQ = q ? `&q=${encodeURIComponent(q)}` : ''
  const base = `/dashboard/azioni-istruttori?lista=${lista}`
  const qui = `${base}&chi=${chi}&quando=${quando}${perQ}`
  const n = (k: string) =>
    lista === 'recupero' ? (k === 'mie' ? numeri.recupero_mie : k === 'libere' ? numeri.recupero_libere : undefined) : k === 'mie' ? numeri.mie_da_fare : k === 'libere' ? numeri.libere : undefined

  return (
    <>
      <div className="testata">
        <div>
          <div className="titolo-riga">
            <h1>Azioni istruttore</h1>
            <span className="aiuto-titolo" tabIndex={0} role="note" aria-label="Cos'è questa sezione">
              <span className="aiuto-punto" aria-hidden="true">?</span>
              <span className="aiuto-testo">
                Le persone da contattare per portarle a provare Formula 8. «Nuovi iscritti» nasce da solo, qualche giorno dopo l’iscrizione. «Recupero Formula 8» è la lista fissa di chi era già abbonato e non ha mai provato:
                si smaltisce un po’ alla volta. In entrambe: prendi in carico quelle che vuoi seguire, poi chiudile dicendo com’è andata.
              </span>
            </span>
          </div>
        </div>
      </div>
      <Avviso errore={searchParams.errore} />
      <div className="schede-gruppi">
        <div className="schede-gruppo tono-lavoro">
          <span className="gruppo-etichetta">{lista === 'recupero' ? 'Recupero' : 'Oggi'}</span>
          <div className="schede-vista">
            <span className="muto">
              {lista === 'recupero'
                ? `${numeri.recupero_mie} in carico a te · ${numeri.recupero_libere} libere · ${numeri.recupero_fatte_settimana} fatte da te negli ultimi 7 giorni · ${numeri.recupero_fatte_totale} fatte in tutto`
                : `${numeri.mie_da_fare} da fare, di cui ${numeri.mie_in_ritardo} in ritardo · ${numeri.libere} libere · ${numeri.fatte_settimana} fatte negli ultimi 7 giorni`}
            </span>
          </div>
        </div>
      </div>
      <SchedeMulti gruppi={[
        { testo: 'Contenitore', tono: 'prova', voci: LISTE.map((v) => ({ testo: v.testo, href: `/dashboard/azioni-istruttori?lista=${v.chiave}`, attivo: v.chiave === lista, n: v.chiave === 'recupero' ? numeri.recupero_libere : numeri.libere })) },
        { testo: 'Di chi', tono: 'lavoro', voci: CHI.map((v) => ({ testo: v.testo, href: `${base}&chi=${v.chiave}&quando=${quando}${perQ}`, attivo: v.chiave === chi, n: quando === 'da_fare' ? n(v.chiave) : undefined })) },
        { testo: 'Stato', tono: 'chiusi', voci: QUANDO.map((v) => ({ testo: v.testo, href: `${base}&chi=${chi}&quando=${v.chiave}${perQ}`, attivo: v.chiave === quando })) },
      ]} />
      <form className="filtri" action="/dashboard/azioni-istruttori">
        <input type="hidden" name="lista" value={lista} />
        <input type="hidden" name="chi" value={chi} />
        <input type="hidden" name="quando" value={quando} />
        <input type="search" name="q" defaultValue={q} placeholder="Cerca per nome, telefono o email" aria-label="Cerca una persona" />
        <button className="bottone secondario" type="submit">Cerca</button>
      </form>

      <div className="scheda">
        {azioni.length === 0 ? (
          <Vuoto>{q ? 'Nessuna azione trovata.' : quando === 'fatte' ? 'Ancora nessuna azione chiusa.' : chi === 'mie' ? 'Non hai azioni in carico. Guarda fra le libere da prendere.' : 'Nessuna azione qui.'}</Vuoto>
        ) : (
          <TabellaAzioniIstruttori azioni={azioni} io={io} torna={qui} />
        )}
      </div>
      {azioni.length >= MOSTRATE && <p className="piccolo attenuato">Vedi le prime {MOSTRATE}: per trovarne una in particolare usa la ricerca.</p>}
    </>
  )
}
