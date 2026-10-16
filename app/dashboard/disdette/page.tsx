import { crm, richiediSezione } from '@/lib/crm'
import { Avviso, LinkGuida, Schede, Vuoto, type GruppoSchede } from '@/components/Ui'
import { FiltroConsulente, consulenteScelto } from '@/components/FiltroConsulente'
import { filtraTesto, testoCercato } from '@/lib/ricerca'
import { TabellaDisdette } from '@/components/TabellaDisdette'

const GRUPPI: GruppoSchede[] = [
  { chiave: 'lavoro', testo: 'Da lavorare', tono: 'lavoro' },
  { chiave: 'chiusi', testo: 'Chiuse', tono: 'chiusi' },
]
const VISTE = [
  { chiave: 'da_gestire', testo: 'Da gestire', gruppo: 'lavoro' },
  { chiave: 'in_gestione', testo: 'In gestione', gruppo: 'lavoro' },
  { chiave: 'mie', testo: 'Le mie', gruppo: 'lavoro' },
  { chiave: 'gestite', testo: 'Gestite', gruppo: 'chiusi' },
  { chiave: 'tutte', testo: 'Tutte' },
]

// Le disdette: quando su PerfectGym compare la data di disdetta di un
// contratto, arriva qui. Si prende in carico come un lead e si chiama il socio
// per provare a recuperarlo; l'esito si scrive nella sua scheda.
export default async function Disdette({ searchParams }: { searchParams: { vista?: string; consulente?: string; q?: string; errore?: string } }) {
  const io = await richiediSezione('disdette')
  const vista = VISTE.some((v) => v.chiave === searchParams.vista) ? searchParams.vista! : 'da_gestire'
  const staff = await crm.staff()
  // Il consulente: chi segue la disdetta.
  const consulente = consulenteScelto(staff, searchParams.consulente)
  const q = testoCercato(searchParams.q)
  const disdette = filtraTesto(await crm.disdette(vista, consulente), q)
  const perConsulente = [consulente && `consulente=${consulente}`, q && `q=${encodeURIComponent(q)}`].filter(Boolean).join('&')
  const qui = `/dashboard/disdette?vista=${vista}${perConsulente ? `&${perConsulente}` : ''}`

  return (
    <>
      <div className="testata">
        <div>
          <div className="titolo-riga">
            <h1>Disdette</h1>
            <span className="aiuto-titolo" tabIndex={0} role="note" aria-label="Cos'è questa sezione">
              <span className="aiuto-punto" aria-hidden="true">?</span>
              <span className="aiuto-testo">Chi ha disdetto su PerfectGym: si prende in carico, poi una telefonata o un appuntamento per capire il motivo e recuperarlo. L&apos;esito si scrive nella scheda.{' '}<LinkGuida argomento="disdette" /></span>
            </span>
          </div>
        </div>
      </div>
      <Avviso errore={searchParams.errore} />
      <Schede voci={VISTE} attiva={vista} base={`/dashboard/disdette${perConsulente ? `?${perConsulente}` : ''}`} gruppi={GRUPPI} />
      <FiltroConsulente azione="/dashboard/disdette" staff={staff} consulente={consulente} tieni={{ vista }} q={q} />

      <div className="scheda">
        {disdette.length === 0 ? (
          <Vuoto>Nessuna disdetta qui.</Vuoto>
        ) : (
          <TabellaDisdette disdette={disdette} io={io} staff={staff} torna={qui} />
        )}
      </div>
    </>
  )
}
