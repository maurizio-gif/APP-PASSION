import { crm, richiediSezione } from '@/lib/crm'
import { Avviso, LinkGuida, Schede, Vuoto } from '@/components/Ui'
import { FiltroConsulente, consulenteScelto } from '@/components/FiltroConsulente'
import { TabellaDisdette } from '@/components/TabellaDisdette'

const VISTE = [
  { chiave: 'da_gestire', testo: 'Da gestire' },
  { chiave: 'in_gestione', testo: 'In gestione' },
  { chiave: 'mie', testo: 'Le mie' },
  { chiave: 'gestite', testo: 'Gestite' },
  { chiave: 'tutte', testo: 'Tutte' },
]

// Le disdette: quando su PerfectGym compare la data di disdetta di un
// contratto, arriva qui. Si prende in carico come un lead e si chiama il socio
// per provare a recuperarlo; l'esito si scrive nella sua scheda.
export default async function Disdette({ searchParams }: { searchParams: { vista?: string; consulente?: string; errore?: string } }) {
  const io = await richiediSezione('disdette')
  const vista = VISTE.some((v) => v.chiave === searchParams.vista) ? searchParams.vista! : 'da_gestire'
  const staff = await crm.staff()
  // Il consulente: chi segue la disdetta.
  const consulente = consulenteScelto(staff, searchParams.consulente)
  const disdette = await crm.disdette(vista, consulente)
  const perConsulente = consulente ? `consulente=${consulente}` : ''
  const qui = `/dashboard/disdette?vista=${vista}${perConsulente ? `&${perConsulente}` : ''}`

  return (
    <>
      <div className="testata">
        <div>
          <h1>Disdette</h1>
          <p>Chi ha disdetto su PerfectGym: si prende in carico, poi una telefonata o un appuntamento per capire il motivo e recuperarlo. L&apos;esito si scrive nella scheda.{' '}<LinkGuida argomento="disdette" /></p>
        </div>
      </div>
      <Avviso errore={searchParams.errore} />
      <Schede voci={VISTE} attiva={vista} base={`/dashboard/disdette${perConsulente ? `?${perConsulente}` : ''}`} />
      <FiltroConsulente azione="/dashboard/disdette" staff={staff} consulente={consulente} tieni={{ vista }} />

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
