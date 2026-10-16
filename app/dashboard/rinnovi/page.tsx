import { crm, richiediSezione } from '@/lib/crm'
import { Avviso, LinkGuida, Schede, Vuoto, type GruppoSchede } from '@/components/Ui'
import { FiltroConsulente, consulenteScelto } from '@/components/FiltroConsulente'
import { filtraTesto, testoCercato } from '@/lib/ricerca'
import { TabellaRinnovi } from '@/components/TabellaRinnovi'

const GRUPPI: GruppoSchede[] = [
  { chiave: 'lavoro', testo: 'Da lavorare', tono: 'lavoro' },
  { chiave: 'chiusi', testo: 'Chiusi', tono: 'chiusi' },
]
const VISTE = [
  { chiave: 'da_gestire', testo: 'Da gestire', gruppo: 'lavoro' },
  { chiave: 'in_gestione', testo: 'In gestione', gruppo: 'lavoro' },
  { chiave: 'mie', testo: 'I miei', gruppo: 'lavoro' },
  { chiave: 'rinnovati', testo: 'Rinnovati', gruppo: 'chiusi' },
  { chiave: 'non_rinnovati', testo: 'Non rinnovati', gruppo: 'chiusi' },
  { chiave: 'tutti', testo: 'Tutti' },
]

// I rinnovi: gli abbonamenti a scadenza fissa che finiscono, uno per contratto,
// dal mirror (20260930c). Si prendono in carico come i lead; l'esito si scrive
// nella scheda della persona, il rinnovo su PerfectGym si vede da solo.
export default async function Rinnovi({ searchParams }: { searchParams: { vista?: string; consulente?: string; q?: string; errore?: string } }) {
  const io = await richiediSezione('rinnovi')
  const vista = VISTE.some((v) => v.chiave === searchParams.vista) ? searchParams.vista! : 'da_gestire'
  const staff = await crm.staff()
  // Il consulente: a chi e' assegnato il rinnovo.
  const consulente = consulenteScelto(staff, searchParams.consulente)
  const q = testoCercato(searchParams.q)
  const rinnovi = filtraTesto(await crm.rinnovi(vista, consulente), q)
  const perConsulente = [consulente && `consulente=${consulente}`, q && `q=${encodeURIComponent(q)}`].filter(Boolean).join('&')
  const qui = `/dashboard/rinnovi?vista=${vista}${perConsulente ? `&${perConsulente}` : ''}`

  return (
    <>
      <div className="testata">
        <div>
          <div className="titolo-riga">
            <h1>Rinnovi</h1>
            <span className="aiuto-titolo" tabIndex={0} role="note" aria-label="Cos'è questa sezione">
              <span className="aiuto-punto" aria-hidden="true">?</span>
              <span className="aiuto-testo">Gli abbonamenti in scadenza: si prendono in carico, e l&apos;esito si scrive nella scheda. Il rinnovo su PerfectGym si vede da solo.{' '}<LinkGuida argomento="rinnovi" /></span>
            </span>
          </div>
        </div>
      </div>
      <Avviso errore={searchParams.errore} />
      <Schede voci={VISTE} attiva={vista} base={`/dashboard/rinnovi${perConsulente ? `?${perConsulente}` : ''}`} gruppi={GRUPPI} />
      <FiltroConsulente azione="/dashboard/rinnovi" staff={staff} consulente={consulente} tieni={{ vista }} q={q} />

      <div className="scheda">
        {rinnovi.length === 0 ? (
          <Vuoto>Nessun rinnovo qui.</Vuoto>
        ) : (
          <TabellaRinnovi rinnovi={rinnovi} io={io} staff={staff} torna={qui} />
        )}
      </div>
    </>
  )
}
