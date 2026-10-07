import Link from 'next/link'
import { crm, richiediSezione } from '@/lib/crm'
import { FONTE } from '@/lib/formato'
import { Avviso, LinkGuida, Schede, Vuoto } from '@/components/Ui'
import { TabellaLead } from '@/components/TabellaLead'

const VISTE = [
  { chiave: 'da_gestire', testo: 'Da gestire' },
  { chiave: 'in_gestione', testo: 'In gestione' },
  { chiave: 'mie', testo: 'I miei' },
  // In gestione, ma senza un task aperto da oggi in avanti: nessuno ha fissato il prossimo passo.
  { chiave: 'senza_task', testo: 'Senza task' },
  // Prove in corso: il Pass e' attivo. Prove scadute: il Pass e' finito senza
  // abbonamento. Vinte: chiuse con un abbonamento.
  { chiave: 'in_prova', testo: 'Prove in corso' },
  { chiave: 'prove_scadute', testo: 'Prove scadute' },
  { chiave: 'vinte', testo: 'Vinte' },
  { chiave: 'perse', testo: 'Perse' },
  { chiave: 'tutte', testo: 'Tutti' },
]

// «Nessun consulente»: i lead senza assegnatario (uuid a zero per crm_lead).
const NESSUN_CONSULENTE = '00000000-0000-0000-0000-000000000000'

type Filtri = { vista?: string; fonte?: string; q?: string; consulente?: string; errore?: string }

export default async function Lead({ searchParams }: { searchParams: Filtri }) {
  await richiediSezione('lead')
  const vista = VISTE.some((v) => v.chiave === searchParams.vista) ? searchParams.vista! : 'da_gestire'
  const fonte = searchParams.fonte && FONTE[searchParams.fonte] ? searchParams.fonte : null
  const q = searchParams.q?.slice(0, 80) || null
  const staff = await crm.staff()
  // Il consulente a cui e' assegnato il lead: uno degli operatori attivi.
  const consulente = searchParams.consulente === NESSUN_CONSULENTE || staff.some((o) => o.id === searchParams.consulente) ? searchParams.consulente! : null
  const [lead, io] = await Promise.all([crm.lead(vista, fonte, q, consulente), crm.io()])
  // Prove in corso, Prove scadute e Vinte: al posto di attivita' e note, il contratto.
  const conContratto = ['in_prova', 'prove_scadute', 'vinte'].includes(vista)
  const contratti = conContratto ? await crm.leadContratti(lead.map((l) => l.id)) : null
  // Nelle Vinte: per data di firma del contratto, dal piu' recente (senza firma in fondo).
  if (vista === 'vinte' && contratti) {
    const firma = (id: string) => { const d = contratti[id]?.data_firma; return d ? new Date(d).getTime() : -Infinity }
    lead.sort((a, b) => firma(b.id) - firma(a.id))
  }
  const filtri = [fonte && `fonte=${fonte}`, q && `q=${encodeURIComponent(q)}`, consulente && `consulente=${consulente}`].filter(Boolean).join('&')
  const qui = `/dashboard/lead?vista=${vista}${filtri ? `&${filtri}` : ''}`
  const base = `/dashboard/lead${filtri ? `?${filtri}` : ''}`

  return (
    <>
      <div className="testata">
        <div>
          <h1>Lead</h1>
          <p>Si prende in carico, si segue coi task e si chiude come persa: vinta la segna PerfectGym, quando compare il contratto o la prova.{' '}<LinkGuida argomento="lead" /></p>
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
        <select name="consulente" defaultValue={consulente ?? ''} aria-label="Consulente">
          <option value="">Tutti i consulenti</option>
          <option value={NESSUN_CONSULENTE}>Nessun consulente</option>
          {staff.map((o) => <option key={o.id} value={o.id}>{o.nome} {o.cognome ?? ''}</option>)}
        </select>
        <button className="bottone secondario" type="submit">Filtra</button>
      </form>

      <div className="scheda">
        {lead.length === 0 ? (
          <Vuoto>Nessun lead qui.</Vuoto>
        ) : (
          <TabellaLead lead={lead} io={io} staff={staff} torna={qui} contratti={contratti} firma={vista === 'vinte'} />
        )}
        <p className="piccolo attenuato conteggio">{lead.length === 200 ? 'I 200 più recenti' : `${lead.length} lead`}</p>
      </div>
    </>
  )
}
