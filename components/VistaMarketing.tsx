import Link from 'next/link'
import type { ReportMarketing } from '@/lib/crm'
import { FONTE } from '@/lib/formato'
import { LinkGuida, Schede, Vuoto } from './Ui'
import { GestioneNumeri, PercorsoLead, TabellaGestione, TabellaPercorsi } from './ReportMarketing'

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

export const LENTI_MARKETING = [
  { chiave: 'percorso', testo: 'Il percorso' },
  { chiave: 'gestione', testo: 'Come vengono gestiti' },
]

export type PeriodoMarketing = { testo: string; dal: string | null; al: string | null }

export function VistaMarketing({ r, lente, vista, dal, al, fonte, oggi, periodi }: {
  r: ReportMarketing
  lente: string
  vista: (typeof VISTE_MARKETING)[number]
  dal: string | null
  al: string | null
  fonte: string | null
  oggi: string
  periodi: PeriodoMarketing[]
}) {
  const filtri = `lente=${lente}&dal=${dal ?? ''}&al=${al ?? ''}${fonte ? `&fonte=${fonte}` : ''}`
  const gestione = lente === 'gestione'
  const soloMeta = vista.chiave === 'gruppo' || vista.chiave === 'modulo'

  return (
    <>
      <div className="testata">
        <div>
          <h1>Marketing</h1>
          <p>Da dove arrivano le opportunità e fin dove arrivano: hanno risposto, hanno attivato la prova, si sono iscritti.{' '}<LinkGuida argomento="marketing" /></p>
        </div>
      </div>

      <div className="schede-vista lenti">
        {LENTI_MARKETING.map((l) => (
          <Link
            key={l.chiave}
            href={`/dashboard/marketing?lente=${l.chiave}&vista=${vista.chiave}&dal=${dal ?? ''}&al=${al ?? ''}${fonte ? `&fonte=${fonte}` : ''}`}
            className={l.chiave === lente ? 'attivo' : undefined}
          >
            {l.testo}
          </Link>
        ))}
      </div>

      <div className="schede-vista periodi">
        {periodi.map((p) => (
          <Link
            key={p.testo}
            href={`/dashboard/marketing?lente=${lente}&vista=${vista.chiave}&dal=${p.dal ?? ''}&al=${p.al ?? ''}${fonte ? `&fonte=${fonte}` : ''}`}
            className={p.dal === dal && p.al === al ? 'attivo' : undefined}
          >
            {p.testo}
          </Link>
        ))}
      </div>

      <form className="filtri filtri-marketing" action="/dashboard/marketing">
        <input type="hidden" name="lente" value={lente} />
        <input type="hidden" name="vista" value={vista.chiave} />
        <label className="piccolo attenuato" htmlFor="mk-dal">Arrivate dal</label>
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
        <h2>{gestione ? 'Come vengono gestite le opportunità' : 'Il percorso delle opportunità'}</h2>
        {r.totale.lead === 0 ? (
          <Vuoto>Nessuna opportunità arrivata in questo periodo.</Vuoto>
        ) : gestione ? (
          <GestioneNumeri t={r.totale} />
        ) : (
          <PercorsoLead t={r.totale} />
        )}
      </section>

      <Schede voci={VISTE_MARKETING} attiva={vista.chiave} base={`/dashboard/marketing?${filtri}`} />

      <div className="scheda">
        {soloMeta && <p className="piccolo attenuato">Gruppi di inserzioni e moduli esistono solo per le opportunità di Meta: qui vedi solo quelle.</p>}
        {r.righe.length === 0 ? (
          <Vuoto>{soloMeta && fonte && fonte !== 'meta' ? 'Questa scheda riguarda solo Meta: togli il filtro sulla fonte.' : 'Nessuna opportunità in questo periodo.'}</Vuoto>
        ) : gestione ? (
          <TabellaGestione righe={r.righe} totale={r.totale} dimensione={vista.chiave} voce={vista.voce} />
        ) : (
          <TabellaPercorsi righe={r.righe} totale={r.totale} dimensione={vista.chiave} voce={vista.voce} />
        )}
        <p className="piccolo attenuato conteggio">
          Le percentuali sono sulle opportunità arrivate. Le opportunità più recenti hanno avuto meno tempo per arrivare in fondo.
          {gestione && ' «Lavorata» vuol dire che c’è almeno un task fatto o un commento. «Ha risposto» vuol dire un task fatto che non sia Negativo: fino ad aprile 2026 il task si creava solo quando la persona rispondeva, e le chiamate senza risposta erano commenti («nr»).'}
        </p>
      </div>
    </>
  )
}
