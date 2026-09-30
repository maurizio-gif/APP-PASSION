import Link from 'next/link'
import { redirect } from 'next/navigation'
import { richiediSezione } from '@/lib/crm'
import { oggiRoma } from '@/lib/formato'
import { assiste } from '@/lib/permessi'
import { Avviso } from '@/components/Ui'
import { ModuloModifica } from '@/components/ModuloModifica'
import { nuovaModifica } from '../../azioni'

// Una modifica decisa nella riunione settimanale con Marco: la scrive R2D,
// una per modifica. Poi si registra la conferma di Marco, e dopo il rilascio
// cosa si e' verificato.
export default async function NuovaModifica({ searchParams }: { searchParams: { errore?: string } }) {
  const io = await richiediSezione('ticket')
  if (!assiste(io)) redirect(`/dashboard/ticket?errore=${encodeURIComponent('Le modifiche le scrive l’assistenza R2D dopo la riunione settimanale.')}`)
  return (
    <>
      <div className="testata">
        <div>
          <h1>Nuova modifica</h1>
          <p>Una per modifica, scritta in modo che Marco la possa confermare leggendola una volta sola.</p>
        </div>
        <Link href="/dashboard/ticket?vista=modifiche">← Modifiche</Link>
      </div>
      <Avviso errore={searchParams.errore} />
      <ModuloModifica azione={nuovaModifica} testo="Scrivi la modifica" riunione={oggiRoma()} />
    </>
  )
}
