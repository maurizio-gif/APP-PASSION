import Link from 'next/link'
import { crm } from '@/lib/crm'
import { FONTE } from '@/lib/formato'
import { Avviso, Schede, Vuoto } from '@/components/Ui'
import { TabellaLead } from '@/components/TabellaLead'

const VISTE = [
  { chiave: 'da_gestire', testo: 'Da gestire' },
  { chiave: 'in_gestione', testo: 'In gestione' },
  { chiave: 'mie', testo: 'I miei' },
  { chiave: 'vinte', testo: 'Vinte' },
  { chiave: 'perse', testo: 'Perse' },
  { chiave: 'tutte', testo: 'Tutti' },
]

export default async function Lead({ searchParams }: { searchParams: { vista?: string; fonte?: string; q?: string; errore?: string } }) {
  const vista = VISTE.some((v) => v.chiave === searchParams.vista) ? searchParams.vista! : 'da_gestire'
  const fonte = searchParams.fonte && FONTE[searchParams.fonte] ? searchParams.fonte : null
  const q = searchParams.q?.slice(0, 80) || null
  const [lead, io, staff] = await Promise.all([crm.lead(vista, fonte, q), crm.io(), crm.staff()])
  const qui = `/dashboard/lead?vista=${vista}${fonte ? `&fonte=${fonte}` : ''}${q ? `&q=${encodeURIComponent(q)}` : ''}`
  const base = `/dashboard/lead?${fonte ? `fonte=${fonte}&` : ''}${q ? `q=${encodeURIComponent(q)}` : ''}`.replace(/[?&]$/, '')

  return (
    <>
      <div className="testata">
        <div>
          <h1>Lead</h1>
          <p>Si commenta finché non c&apos;è un contatto, poi lo si prende in carico e lo si chiude.</p>
        </div>
        <Link className="bottone" href="/dashboard/lead/nuovo">+ Nuovo lead</Link>
      </div>
      <Avviso errore={searchParams.errore} />

      <Schede voci={VISTE} attiva={vista} base={base} />

      <form className="filtri" action="/dashboard/lead">
        <input type="hidden" name="vista" value={vista} />
        <input type="search" name="q" defaultValue={q ?? ''} placeholder="Nome, cognome, telefono, email" />
        <select name="fonte" defaultValue={fonte ?? ''} aria-label="Fonte">
          <option value="">Tutte le fonti</option>
          {Object.entries(FONTE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="bottone secondario" type="submit">Filtra</button>
      </form>

      <div className="scheda">
        {lead.length === 0 ? (
          <Vuoto>Nessun lead qui.</Vuoto>
        ) : (
          <TabellaLead lead={lead} io={io} staff={staff} torna={qui} />
        )}
        <p className="piccolo attenuato conteggio">{lead.length === 200 ? 'I 200 più recenti' : `${lead.length} lead`}</p>
      </div>
    </>
  )
}
