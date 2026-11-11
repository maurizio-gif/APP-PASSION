import { crm, NonAutorizzato } from '@/lib/crm'
import type { ChiaveListaNewsletter } from '@/lib/crm'

export const dynamic = 'force-dynamic'

const LISTE: Record<ChiaveListaNewsletter, string> = {
  attivi: 'attivi',
  soci: 'soci',
  terminati: 'terminati',
  lead: 'lead',
  guest_pass_attivi: 'guest-pass-attivi',
  tutto: 'tutto-il-database',
}

// Il file di una lista newsletter, da dare a Perfect Gym: CSV con la sola colonna UserNumber. Il database lo da'
// solo a chi puo' vedere le liste newsletter; agli altri risponde 403. Si scarica sempre con i dati di adesso.
export async function GET(richiesta: Request, { params }: { params: { lista: string } }) {
  const lista = params.lista as ChiaveListaNewsletter
  if (!Object.prototype.hasOwnProperty.call(LISTE, lista)) return new Response('Lista non trovata', { status: 404 })
  const soloConsenso = new URL(richiesta.url).searchParams.get('consenso') === '1'
  try {
    const csv = await crm.listaNewsletterCsv(lista, soloConsenso)
    const oggi = new Date().toISOString().slice(0, 10)
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="newsletter-${LISTE[lista]}${soloConsenso ? '-con-consenso' : ''}-${oggi}.csv"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (e) {
    if (e instanceof NonAutorizzato) return new Response('Non autorizzato', { status: 403 })
    throw e
  }
}
