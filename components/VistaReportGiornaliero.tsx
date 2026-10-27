import Link from 'next/link'
import type { EventoGiorno, Operatore, ReportGiornaliero, TipoEvento } from '@/lib/crm'
import { ESITO_DISDETTA, ESITO_RINNOVO, FONTE, TIPO_TASK, formatoCifra, formatoGiornoLungo, formatoOra, spostaGiorno, traduci } from '@/lib/formato'
import { BollinoFase, BollinoFonte, Contatti, Persona, Vuoto } from './Ui'

// Il report giornaliero, disegnato: riceve le righe di crm_report_giornaliero()
// e le conta e le raggruppa; le regole (cosa vuol dire «del giorno» per ogni
// tipo) stanno nel database, in supabase/migrations/20261027c_report_giornaliero.sql.

export const GRUPPI = [
  { chiave: 'opportunita', testo: 'Opportunità' },
  { chiave: 'commenti', testo: 'Commenti' },
  { chiave: 'task', testo: 'Task' },
  { chiave: 'pass', testo: 'Pass attivati' },
  { chiave: 'abbonamenti', testo: 'Abbonamenti venduti' },
  { chiave: 'disdette', testo: 'Disdette' },
  { chiave: 'rinnovi', testo: 'Rinnovi' },
] as const
export type Gruppo = (typeof GRUPPI)[number]['chiave']

// Le sezioni in ordine di funnel: arriva, si prende in carico, si lavora, si chiude.
const SEZIONI: { chiave: string; gruppo: Gruppo; tipo: TipoEvento; titolo: string; spiega: string }[] = [
  { chiave: 'arrivate', gruppo: 'opportunita', tipo: 'lead_arrivato', titolo: 'Opportunità arrivate', spiega: 'nate in questo giorno, da qualsiasi fonte' },
  { chiave: 'prese', gruppo: 'opportunita', tipo: 'lead_preso', titolo: 'Opportunità prese in carico', spiega: 'prese in carico in questo giorno, anche se arrivate prima' },
  { chiave: 'commenti', gruppo: 'commenti', tipo: 'commento', titolo: 'Commenti', spiega: 'scritti in questo giorno nelle schede delle persone' },
  { chiave: 'task-fatti', gruppo: 'task', tipo: 'task_fatto', titolo: 'Task fatti', spiega: 'chiusi dal personale in questo giorno, con l’esito' },
  { chiave: 'task-creati', gruppo: 'task', tipo: 'task_creato', titolo: 'Task creati', spiega: 'programmati in questo giorno, per qualsiasi data' },
  { chiave: 'pass', gruppo: 'pass', tipo: 'pass', titolo: 'Pass attivati', spiega: 'Guest Pass e pass giornalieri firmati in questo giorno' },
  { chiave: 'abbonamenti', gruppo: 'abbonamenti', tipo: 'abbonamento', titolo: 'Abbonamenti venduti', spiega: 'abbonamenti a pagamento firmati in questo giorno' },
  { chiave: 'chiuse', gruppo: 'opportunita', tipo: 'lead_chiuso', titolo: 'Opportunità chiuse', spiega: 'vinte o perse in questo giorno: la vincita la segna da sola PerfectGym' },
  { chiave: 'disdette-gestite', gruppo: 'disdette', tipo: 'disdetta_gestita', titolo: 'Disdette gestite', spiega: 'lavorate in questo giorno, con l’esito' },
  { chiave: 'disdette-nuove', gruppo: 'disdette', tipo: 'disdetta_arrivata', titolo: 'Disdette arrivate', spiega: 'registrate in questo giorno' },
  { chiave: 'rinnovi', gruppo: 'rinnovi', tipo: 'rinnovo_gestito', titolo: 'Rinnovi gestiti', spiega: 'chiusi in questo giorno' },
]

const conta = (eventi: EventoGiorno[], tipo: TipoEvento, quando: (e: EventoGiorno) => boolean = () => true) =>
  eventi.filter((e) => e.tipo === tipo && quando(e)).length

// «3 tour · 2 sito»: le parti a zero non si scrivono.
// Ogni parte è [numero, plurale, singolare?]: «1 rinnovato», «2 rinnovati».
const elenca = (parti: [number, string, string?][], vuoto: string) => {
  const piene = parti.filter(([n]) => n > 0).map(([n, t, uno]) => `${formatoCifra(n)} ${n === 1 && uno ? uno : t}`)
  return piene.length ? piene.join(' · ') : vuoto
}

export function VistaReportGiornaliero({
  report,
  oggi,
  staff,
  consulente,
  gruppo,
}: {
  report: ReportGiornaliero
  oggi: string
  staff: Operatore[]
  consulente: string | null
  gruppo: Gruppo | null
}) {
  const { giorno, eventi } = report

  // I link tengono il consulente e il tipo scelti.
  const perLink = (g: string) => {
    const q = new URLSearchParams({ giorno: g })
    if (consulente) q.set('consulente', consulente)
    if (gruppo) q.set('tipo', gruppo)
    return `/dashboard/report-giornaliero?${q.toString()}`
  }

  const fontiArrivate = Object.entries(
    eventi.filter((e) => e.tipo === 'lead_arrivato').reduce<Record<string, number>>((a, e) => ({ ...a, [e.sottotipo ?? 'altro']: (a[e.sottotipo ?? 'altro'] ?? 0) + 1 }), {}),
  ).map(([f, n]) => [n, traduci(FONTE, f).toLowerCase()] as [number, string])

  const tessere: { titolo: string; valore: number; nota: string; ancora: string; tono?: string }[] = [
    {
      titolo: 'Opportunità arrivate',
      valore: conta(eventi, 'lead_arrivato'),
      nota: elenca(fontiArrivate, 'Nessuna arrivata'),
      ancora: 'arrivate',
    },
    {
      titolo: 'Prese in carico',
      valore: conta(eventi, 'lead_preso'),
      nota: elenca([[conta(eventi, 'lead_arrivato', (e) => !e.consulente_id), 'arrivate senza consulente', 'arrivata senza consulente']], 'Tutte con un consulente'),
      ancora: 'prese',
    },
    {
      titolo: 'Task fatti',
      valore: conta(eventi, 'task_fatto'),
      nota: elenca([[conta(eventi, 'task_fatto', (e) => e.esito === 'positivo'), 'positivi', 'positivo'], [conta(eventi, 'task_fatto', (e) => e.esito === 'negativo'), 'negativi', 'negativo']], 'Nessuno chiuso'),
      ancora: 'task-fatti',
    },
    { titolo: 'Commenti', valore: conta(eventi, 'commento'), nota: `${formatoCifra(conta(eventi, 'task_creato'))} task creati`, ancora: 'commenti' },
    { titolo: 'Pass attivati', valore: conta(eventi, 'pass'), nota: 'Guest Pass e giornalieri', ancora: 'pass' },
    {
      titolo: 'Abbonamenti venduti',
      valore: conta(eventi, 'abbonamento'),
      nota: elenca([[conta(eventi, 'abbonamento', (e) => e.sottotipo === 'nuovo'), 'nuovi', 'nuovo'], [conta(eventi, 'abbonamento', (e) => e.sottotipo === 'rinnovo'), 'rinnovi o cambi', 'rinnovo o cambio']], 'Nessuno'),
      ancora: 'abbonamenti',
      tono: 'verde',
    },
    {
      titolo: 'Opportunità chiuse',
      valore: conta(eventi, 'lead_chiuso'),
      nota: elenca([[conta(eventi, 'lead_chiuso', (e) => e.esito === 'vinta'), 'vinte', 'vinta'], [conta(eventi, 'lead_chiuso', (e) => e.esito === 'persa'), 'perse', 'persa']], 'Nessuna chiusa'),
      ancora: 'chiuse',
    },
    {
      titolo: 'Disdette gestite',
      valore: conta(eventi, 'disdetta_gestita'),
      nota: elenca(
        [
          [conta(eventi, 'disdetta_gestita', (e) => e.esito === 'vinto'), 'recuperate', 'recuperata'],
          [conta(eventi, 'disdetta_gestita', (e) => e.esito === 'perso'), 'perse', 'persa'],
          [conta(eventi, 'disdetta_arrivata'), 'nuove', 'nuova'],
        ],
        'Nessuna lavorata',
      ),
      ancora: 'disdette-gestite',
    },
    {
      titolo: 'Rinnovi gestiti',
      valore: conta(eventi, 'rinnovo_gestito'),
      nota: elenca([[conta(eventi, 'rinnovo_gestito', (e) => e.esito === 'rinnovato'), 'rinnovati', 'rinnovato'], [conta(eventi, 'rinnovo_gestito', (e) => e.esito === 'non_rinnovato'), 'non rinnovati', 'non rinnovato']], 'Nessuno'),
      ancora: 'rinnovi',
    },
  ]

  // Chi ha fatto cosa: una riga per consulente. Le opportunità arrivate senza
  // nessuno stanno a parte, perché sono quelle che aspettano.
  const perConsulente = new Map<string, { nome: string; conta: Record<string, number> }>()
  const aggiungi = (e: EventoGiorno, colonna: string) => {
    const chiave = e.consulente_id ?? 'nessuno'
    const riga = perConsulente.get(chiave) ?? { nome: e.consulente ?? 'Senza consulente', conta: {} }
    riga.conta[colonna] = (riga.conta[colonna] ?? 0) + 1
    perConsulente.set(chiave, riga)
  }
  for (const e of eventi) {
    if (e.tipo === 'lead_preso') aggiungi(e, 'prese')
    else if (e.tipo === 'task_fatto') aggiungi(e, 'task')
    else if (e.tipo === 'commento') aggiungi(e, 'commenti')
    else if (e.tipo === 'pass') aggiungi(e, 'pass')
    else if (e.tipo === 'abbonamento') aggiungi(e, 'abbonamenti')
    else if (e.tipo === 'lead_chiuso' && e.esito === 'vinta') aggiungi(e, 'vinte')
    else if (e.tipo === 'disdetta_gestita') aggiungi(e, 'disdette')
    else if (e.tipo === 'rinnovo_gestito') aggiungi(e, 'rinnovi')
    else if (e.tipo === 'lead_arrivato' && !e.consulente_id) aggiungi(e, 'attesa')
  }
  const COLONNE = [
    ['prese', 'Prese in carico'],
    ['task', 'Task fatti'],
    ['commenti', 'Commenti'],
    ['pass', 'Pass'],
    ['abbonamenti', 'Abbonamenti'],
    ['vinte', 'Opportunità vinte'],
    ['disdette', 'Disdette gestite'],
    ['rinnovi', 'Rinnovi'],
    ['attesa', 'Arrivate, in attesa'],
  ] as const
  const righeConsulenti = [...perConsulente.entries()].sort(
    ([a, x], [b, y]) => (a === 'nessuno' ? 1 : 0) - (b === 'nessuno' ? 1 : 0) || Object.values(y.conta).reduce((s, n) => s + n, 0) - Object.values(x.conta).reduce((s, n) => s + n, 0),
  )

  const sezioni = SEZIONI.filter((s) => !gruppo || s.gruppo === gruppo)
    .map((s) => ({ ...s, righe: eventi.filter((e) => e.tipo === s.tipo) }))
    .filter((s) => s.righe.length > 0)

  return (
    <>
      <div className="testata">
        <div>
          <h1>Report giornaliero</h1>
          <p>
            {giorno === oggi ? 'Oggi, ' : ''}
            {formatoGiornoLungo(giorno)}. Tutto quello che è successo in un giorno, dall’opportunità che arriva all’abbonamento: come è stata gestita, le azioni e l’esito. Il giorno va da mezzanotte a mezzanotte, ora di Roma.
          </p>
        </div>
      </div>

      <form className="filtri" action="/dashboard/report-giornaliero">
        <Link className="bottone secondario" href={perLink(spostaGiorno(giorno, -1))} aria-label="Giorno prima">
          ←
        </Link>
        <input type="date" name="giorno" defaultValue={giorno} max={oggi} aria-label="Giorno" />
        {giorno < oggi && (
          <Link className="bottone secondario" href={perLink(spostaGiorno(giorno, 1))} aria-label="Giorno dopo">
            →
          </Link>
        )}
        {giorno !== oggi && (
          <Link className="bottone secondario" href={perLink(oggi)}>
            Oggi
          </Link>
        )}
        <select name="consulente" defaultValue={consulente ?? ''} aria-label="Consulente">
          <option value="">Tutti i consulenti</option>
          {staff.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nome} {o.cognome ?? ''}
            </option>
          ))}
        </select>
        <select name="tipo" defaultValue={gruppo ?? ''} aria-label="Tipologia">
          <option value="">Tutte le tipologie</option>
          {GRUPPI.map((g) => (
            <option key={g.chiave} value={g.chiave}>
              {g.testo}
            </option>
          ))}
        </select>
        <button className="bottone" type="submit">
          Vai
        </button>
      </form>

      <div className="numeri">
        {tessere.map((t) => (
          <a key={t.titolo} href={`#${t.ancora}`} className="numero">
            <div className="etichetta">{t.titolo}</div>
            <div className="valore">{formatoCifra(t.valore)}</div>
            <div className="nota">{t.nota}</div>
          </a>
        ))}
      </div>

      {!consulente && righeConsulenti.length > 0 && (
        <section className="scheda">
          <h2>Per consulente</h2>
          <p className="piccolo attenuato sotto-titolo">
            Quello che ognuno ha fatto in questo giorno. Pass e abbonamenti vanno al consulente dell’opportunità che li ha chiusi o, se non
            c’è, dell’ultima opportunità assegnata alla persona; gli abbonamenti senza opportunità, a chi li ha preso in carico da «Contratti
            senza consulente» (finché nessuno lo fa, sono «Senza consulente»). «Arrivate, in attesa» sono le opportunità nate oggi che non hanno ancora un
            consulente.
          </p>
          <div className="tabella-scorre">
            <table>
              <thead>
                <tr>
                  <th>Consulente</th>
                  {COLONNE.map(([k, t]) => (
                    <th key={k} className="num">
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {righeConsulenti.map(([id, r]) => (
                  <tr key={id}>
                    <td>
                      {id === 'nessuno' ? (
                        <span className="attenuato">{r.nome}</span>
                      ) : (
                        <Link href={`/dashboard/report-giornaliero?giorno=${giorno}&consulente=${id}${gruppo ? `&tipo=${gruppo}` : ''}`}>
                          <strong>{r.nome}</strong>
                        </Link>
                      )}
                    </td>
                    {COLONNE.map(([k]) => (
                      <td key={k} className="num">
                        {r.conta[k] ? formatoCifra(r.conta[k]) : <span className="attenuato">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {sezioni.length === 0 && (
        <div className="scheda">
          <Vuoto>{eventi.length === 0 ? 'Non è successo niente in questo giorno.' : 'Niente di questo tipo in questo giorno.'}</Vuoto>
        </div>
      )}

      {sezioni.map((s) => (
        <details key={s.chiave} id={s.chiave} className="scheda" open={s.righe.length <= 40 || Boolean(gruppo)}>
          <summary>
            <strong>{s.titolo}</strong> · {formatoCifra(s.righe.length)} <span className="piccolo attenuato">— {s.spiega}</span>
          </summary>
          <div className="tabella-scorre">
            <table className="schede-mobile">
              <thead>
                <tr>
                  <th>Ora</th>
                  <th>Persona</th>
                  <th>Cosa</th>
                  <th>Consulente</th>
                </tr>
              </thead>
              <tbody>
                {s.righe.map((e, i) => (
                  <tr key={`${s.chiave}-${i}`}>
                    <td className="nowrap piccolo">{e.ora ? formatoOra(e.ora) : '—'}</td>
                    <td>
                      <Persona id={e.utente_id} nome={e.nome} cognome={e.cognome} nuovaScheda />
                      <Contatti telefono={e.telefono} email={e.email} />
                    </td>
                    <td className="piccolo info">
                      <Cosa e={e} />
                    </td>
                    <td className="nowrap">{e.consulente ?? <span className="attenuato">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ))}
    </>
  )
}

// Cosa è successo in questa riga: dipende dal tipo.
function Cosa({ e }: { e: EventoGiorno }) {
  const testo = e.dettaglio ? <div className="attenuato" style={{ whiteSpace: 'pre-wrap' }}>{e.dettaglio}</div> : null
  switch (e.tipo) {
    case 'lead_arrivato':
      return (
        <>
          <BollinoFonte fonte={e.sottotipo} />
          {e.titolo && <strong> {e.titolo}</strong>}
          {testo}
        </>
      )
    case 'lead_preso':
      return (
        <>
          <BollinoFonte fonte={e.sottotipo} />
          {e.titolo && <strong> {e.titolo}</strong>}
        </>
      )
    case 'lead_chiuso':
      return (
        <>
          <BollinoFase fase={e.esito ?? 'persa'} esito={e.sottotipo} />
          {e.titolo && <strong> {e.titolo}</strong>}
          {testo}
        </>
      )
    case 'commento':
      return <div style={{ whiteSpace: 'pre-wrap' }}>{e.dettaglio}</div>
    case 'task_fatto':
    case 'task_creato':
      return (
        <>
          <strong>{traduci(TIPO_TASK, e.sottotipo)}</strong>
          {e.esito && <span className={`bollino ${e.esito === 'positivo' ? 'verde' : 'grigio'}`}>{e.esito === 'positivo' ? 'Positivo' : 'Negativo'}</span>}
          {e.titolo && <div>{e.titolo}</div>}
          {testo}
        </>
      )
    case 'pass':
      return (
        <>
          <strong>{e.titolo}</strong>
          {testo}
        </>
      )
    case 'abbonamento':
      return (
        <>
          <span className={`bollino ${e.sottotipo === 'nuovo' ? 'verde' : 'grigio'}`}>{e.sottotipo === 'nuovo' ? 'Nuovo' : 'Rinnovo o cambio'}</span>{' '}
          <strong>{e.titolo}</strong>
          {testo}
        </>
      )
    case 'disdetta_gestita':
    case 'disdetta_arrivata':
      return (
        <>
          {e.esito ? (
            <span className={`bollino ${e.esito === 'vinto' ? 'verde' : e.esito === 'perso' ? 'grigio' : 'giallo'}`}>{traduci(ESITO_DISDETTA, e.esito)}</span>
          ) : (
            <span className="bollino rosso">Da gestire</span>
          )}
          {e.sottotipo && <span className="attenuato"> {e.sottotipo}</span>}
          {testo}
        </>
      )
    case 'rinnovo_gestito':
      return (
        <>
          <span className={`bollino ${e.esito === 'rinnovato' ? 'verde' : 'grigio'}`}>{traduci(ESITO_RINNOVO, e.esito)}</span> <strong>{e.titolo}</strong>
          {testo}
        </>
      )
  }
}
