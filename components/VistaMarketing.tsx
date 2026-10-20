import Link from 'next/link'
import type { ReportMarketing } from '@/lib/crm'
import { FONTE } from '@/lib/formato'
import { LinkGuida, Schede, Vuoto } from './Ui'
import { PercorsoLead, TabellaPercorsi } from './ReportMarketing'

// La pagina Marketing, disegnata: riceve i numeri di crm_report_marketing() e
// i filtri scelti, e non ne calcola nessuno (le regole stanno nel database, in
// supabase/migrations/20261020a_report_marketing.sql).

// Ogni scheda e' un modo di raggruppare gli stessi lead.
export const VISTE_MARKETING = [
  { chiave: 'fonte', testo: 'Fonte', voce: 'Fonte' },
  { chiave: 'campagna', testo: 'Campagna / dettaglio', voce: 'Campagna o dettaglio' },
  { chiave: 'gruppo', testo: 'Gruppo di inserzioni', voce: 'Gruppo di inserzioni (Meta)' },
  { chiave: 'modulo', testo: 'Modulo Meta', voce: 'Modulo (Meta)' },
  { chiave: 'attivita', testo: 'Attività di interesse', voce: 'Attività di interesse' },
  { chiave: 'mese', testo: 'Mese di arrivo', voce: 'Mese di arrivo' },
]

export type PeriodoMarketing = { testo: string; dal: string | null; al: string | null }

export function VistaMarketing({ r, vista, dal, al, fonte, oggi, periodi }: {
  r: ReportMarketing
  vista: (typeof VISTE_MARKETING)[number]
  dal: string | null
  al: string | null
  fonte: string | null
  oggi: string
  periodi: PeriodoMarketing[]
}) {
  const filtri = `dal=${dal ?? ''}&al=${al ?? ''}${fonte ? `&fonte=${fonte}` : ''}`
  const soloMeta = vista.chiave === 'gruppo' || vista.chiave === 'modulo'

  return (
    <>
      <div className="testata">
        <div>
          <h1>Marketing</h1>
          <p>Da dove arrivano i lead e fin dove arrivano: hanno risposto, hanno attivato la prova, si sono iscritti.{' '}<LinkGuida argomento="marketing" /></p>
        </div>
      </div>

      <div className="schede-vista periodi">
        {periodi.map((p) => (
          <Link
            key={p.testo}
            href={`/dashboard/marketing?vista=${vista.chiave}&dal=${p.dal ?? ''}&al=${p.al ?? ''}${fonte ? `&fonte=${fonte}` : ''}`}
            className={p.dal === dal && p.al === al ? 'attivo' : undefined}
          >
            {p.testo}
          </Link>
        ))}
      </div>

      <form className="filtri filtri-marketing" action="/dashboard/marketing">
        <input type="hidden" name="vista" value={vista.chiave} />
        <label className="piccolo attenuato" htmlFor="mk-dal">Arrivati dal</label>
        <input id="mk-dal" type="date" name="dal" defaultValue={dal ?? ''} max={oggi} />
        <label className="piccolo attenuato" htmlFor="mk-al">al</label>
        <input id="mk-al" type="date" name="al" defaultValue={al ?? ''} max={oggi} />
        <select name="fonte" defaultValue={fonte ?? ''} aria-label="Fonte">
          <option value="">Tutte le fonti</option>
          {Object.entries(FONTE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="bottone secondario" type="submit">Applica</button>
      </form>

      <section className="scheda">
        <h2>Il percorso dei lead</h2>
        {r.totale.lead === 0 ? (
          <Vuoto>Nessun lead arrivato in questo periodo.</Vuoto>
        ) : (
          <PercorsoLead t={r.totale} />
        )}
      </section>

      <Schede voci={VISTE_MARKETING} attiva={vista.chiave} base={`/dashboard/marketing?${filtri}`} />

      <div className="scheda">
        {soloMeta && <p className="piccolo attenuato">Gruppi di inserzioni e moduli esistono solo per i lead di Meta: qui vedi solo quelli.</p>}
        {r.righe.length === 0 ? (
          <Vuoto>{soloMeta && fonte && fonte !== 'meta' ? 'Questa scheda riguarda solo Meta: togli il filtro sulla fonte.' : 'Nessun lead in questo periodo.'}</Vuoto>
        ) : (
          <TabellaPercorsi righe={r.righe} totale={r.totale} dimensione={vista.chiave} voce={vista.voce} />
        )}
        <p className="piccolo attenuato conteggio">
          Le percentuali sono sui lead arrivati. I lead più recenti hanno avuto meno tempo per arrivare in fondo.
        </p>
      </div>
    </>
  )
}
