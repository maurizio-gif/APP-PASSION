import { crm, richiediSezione } from '@/lib/crm'
import { eGiornoValido, FONTE, oggiRoma, spostaGiorno } from '@/lib/formato'
import { LENTI_MARKETING, VISTE_MARKETING, VistaMarketing } from '@/components/VistaMarketing'

// Da dove arrivano i lead e fin dove arrivano: qualificati (hanno risposto),
// prova attivata (facoltativa) e iscritti. Le regole stanno nel database, in
// supabase/migrations/20261020a_report_marketing.sql.

type Filtri = { lente?: string; vista?: string; dal?: string; al?: string; fonte?: string }

export default async function Marketing({ searchParams }: { searchParams: Filtri }) {
  await richiediSezione('marketing')
  const vista = VISTE_MARKETING.find((v) => v.chiave === searchParams.vista) ?? VISTE_MARKETING[0]
  const lente = LENTI_MARKETING.find((l) => l.chiave === searchParams.lente)?.chiave ?? 'percorso'
  const fonte = searchParams.fonte && FONTE[searchParams.fonte] ? searchParams.fonte : null

  // Senza date: gli ultimi 90 giorni. Con le date vuote: tutto lo storico.
  const oggi = oggiRoma()
  const senzaDate = searchParams.dal === undefined && searchParams.al === undefined
  let dal = senzaDate ? spostaGiorno(oggi, -89) : eGiornoValido(searchParams.dal) ? searchParams.dal : null
  let al = senzaDate ? oggi : eGiornoValido(searchParams.al) ? searchParams.al : null
  if (dal && al && dal > al) [dal, al] = [al, dal]

  const periodi = [
    { testo: 'Ultimi 30 giorni', dal: spostaGiorno(oggi, -29), al: oggi },
    { testo: 'Ultimi 90 giorni', dal: spostaGiorno(oggi, -89), al: oggi },
    { testo: 'Ultimi 6 mesi', dal: spostaGiorno(oggi, -179), al: oggi },
    { testo: 'Quest’anno', dal: `${oggi.slice(0, 4)}-01-01`, al: oggi },
    { testo: 'Tutto', dal: null, al: null },
  ]

  const r = await crm.reportMarketing(vista.chiave, dal, al, fonte)
  return <VistaMarketing r={r} lente={lente} vista={vista} dal={dal} al={al} fonte={fonte} oggi={oggi} periodi={periodi} />
}
