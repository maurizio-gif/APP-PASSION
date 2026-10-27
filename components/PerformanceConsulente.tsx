import type { Operatore, Performance, PerformanceSettimana as Sett } from '@/lib/crm'
import { formatoCifra } from '@/lib/formato'
import { ORARIO_LAVORO, SOGLIA_VERDE, tempoLavoro } from '@/lib/velocita'
import { Colonne, type Punto } from './Colonne'

// La performance del consulente, settimana per settimana (da lunedì a domenica,
// ora di Roma), col confronto con le settimane passate. I numeri li calcola il
// database (supabase/migrations/20261027d_primo_ricontatto_e_performance.sql):
// qui si fanno solo le percentuali e i confronti.
//
// Le percentuali delle opportunità sono «sulle opportunità prese in carico in
// quella settimana»: una settimana vecchia è completa, quella in corso cresce
// man mano che le opportunità si chiudono, per questo è tratteggiata.

type Formato = 'percento' | 'intero' | 'minuti'

type Metrica = {
  chiave: string
  titolo: string
  spiega: string
  formato: Formato
  // Il numero migliore è l'alto o il basso (il tempo di ricontatto: il basso).
  meglio: 'alto' | 'basso'
  // Una percentuale ha numeratore e denominatore; un numero solo `valore`.
  num?: (w: Sett) => number
  den?: (w: Sett) => number
  valore?: (w: Sett) => number | null
  sotto?: (w: Sett) => string
}

const METRICHE: Metrica[] = [
  {
    chiave: 'prese',
    titolo: 'Opportunità prese in carico',
    spiega: 'assegnate a te e prese in carico nella settimana: da qui partono le percentuali',
    formato: 'intero',
    meglio: 'alto',
    valore: (w) => w.prese,
  },
  {
    chiave: 'chiuse',
    titolo: 'Opportunità chiuse',
    spiega: 'quante di quelle prese in carico oggi sono chiuse, vinte o perse',
    formato: 'percento',
    meglio: 'alto',
    num: (w) => w.chiuse,
    den: (w) => w.prese,
    sotto: (w) => `${formatoCifra(w.vinte)} vinte`,
  },
  {
    chiave: 'pass',
    titolo: 'Opportunità → Guest Pass',
    spiega: 'quante hanno un Guest Pass o un pass giornaliero firmato dopo l’arrivo',
    formato: 'percento',
    meglio: 'alto',
    num: (w) => w.con_pass,
    den: (w) => w.prese,
  },
  {
    chiave: 'prove',
    titolo: 'Guest Pass → abbonamento',
    spiega: 'le tue prove finite nella settimana che si sono abbonate',
    formato: 'percento',
    meglio: 'alto',
    num: (w) => w.prove_iscritte,
    den: (w) => w.prove_finite,
  },
  {
    chiave: 'opp-abbonamento',
    titolo: 'Opportunità → abbonamento',
    spiega: 'quante hanno un abbonamento firmato dopo l’arrivo, con o senza prova',
    formato: 'percento',
    meglio: 'alto',
    num: (w) => w.con_abbonamento,
    den: (w) => w.prese,
  },
  {
    chiave: 'venduti',
    titolo: 'Abbonamenti venduti',
    spiega: 'firmati nella settimana e attribuiti a te, come nel Report giornaliero',
    formato: 'intero',
    meglio: 'alto',
    valore: (w) => w.abbonamenti,
    sotto: (w) => `${formatoCifra(w.abbonamenti_nuovi)} nuovi`,
  },
  {
    chiave: 'ricontatto',
    titolo: 'Tempo di primo ricontatto',
    spiega: `mediano, dalla presa in carico, anche con un tentativo (${ORARIO_LAVORO})`,
    formato: 'minuti',
    meglio: 'basso',
    valore: (w) => w.dopo_presa_mediano_min,
  },
  {
    chiave: 'ricontatto-30',
    titolo: `Ricontattate entro ${SOGLIA_VERDE} minuti`,
    spiega: 'minuti di orario di lavoro dalla presa in carico, sulle opportunità ricontattate',
    formato: 'percento',
    meglio: 'alto',
    num: (w) => w.dopo_presa_30,
    den: (w) => w.ricontattate,
  },
  {
    chiave: 'disdette',
    titolo: 'Disdette recuperate',
    spiega: 'sulle disdette che hai gestito nella settimana',
    formato: 'percento',
    meglio: 'alto',
    num: (w) => w.disdette_recuperate,
    den: (w) => w.disdette_gestite,
  },
  {
    chiave: 'rinnovi',
    titolo: 'Rinnovi riusciti',
    spiega: 'sui rinnovi che hai chiuso nella settimana',
    formato: 'percento',
    meglio: 'alto',
    num: (w) => w.rinnovi_rinnovati,
    den: (w) => w.rinnovi_gestiti,
  },
  {
    chiave: 'task',
    titolo: 'Task fatti',
    spiega: 'chiusi nella settimana, anche senza risposta',
    formato: 'intero',
    meglio: 'alto',
    valore: (w) => w.task_fatti,
    sotto: (w) => `${formatoCifra(w.task_positivi)} positivi`,
  },
]

const percentuale = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 100) : null)

// Il valore della settimana: una percentuale intera, un numero, o i minuti.
const valoreDi = (m: Metrica, w: Sett): number | null => (m.num && m.den ? percentuale(m.num(w), m.den(w)) : m.valore ? m.valore(w) : null)

// Il valore sulle settimane insieme: le percentuali si sommano prima di dividere,
// i numeri si mediano, i minuti si mediano fra le settimane che li hanno.
function valoreMedio(m: Metrica, sett: Sett[]): number | null {
  if (sett.length === 0) return null
  if (m.num && m.den) return percentuale(sett.reduce((a, w) => a + m.num!(w), 0), sett.reduce((a, w) => a + m.den!(w), 0))
  const v = sett.map((w) => valoreDi(m, w)).filter((x): x is number => x != null)
  if (v.length === 0) return null
  const media = v.reduce((a, b) => a + b, 0) / v.length
  return m.formato === 'intero' ? Math.round(media * 10) / 10 : Math.round(media)
}

function scrivi(m: Metrica, v: number | null) {
  if (v == null) return '—'
  if (m.formato === 'percento') return `${formatoCifra(v)}%`
  if (m.formato === 'minuti') return tempoLavoro(v)
  return formatoCifra(v, Number.isInteger(v) ? 0 : 1)
}

// «+4 punti», «+3», «−12 min»: di quanto cambia, e se è meglio o peggio.
function differenza(m: Metrica, ora: number | null, prima: number | null) {
  if (ora == null || prima == null) return null
  const d = ora - prima
  if (d === 0) return { testo: '=', tono: 'grigio' }
  const meglio = m.meglio === 'alto' ? d > 0 : d < 0
  const segno = d > 0 ? '+' : '−'
  const assoluto = Math.abs(Math.round(d * 10) / 10)
  const testo =
    m.formato === 'percento' ? `${segno}${assoluto} ${assoluto === 1 ? 'punto' : 'punti'}` : m.formato === 'minuti' ? `${segno}${tempoLavoro(assoluto)}` : `${segno}${formatoCifra(assoluto, Number.isInteger(assoluto) ? 0 : 1)}`
  return { testo: `${d > 0 ? '▲' : '▼'} ${testo}`, tono: meglio ? 'verde' : 'rosso' }
}

const giornoMese = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const giornoMeseLungo = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', timeZone: 'UTC' })
const data = (g: string) => new Date(`${g}T12:00:00Z`)
const dopo = (g: string, giorni: number) => new Date(data(g).getTime() + giorni * 86400000)

export function PerformanceConsulente({
  p,
  staff,
  consulente,
  admin,
  propria,
}: {
  p: Performance
  staff: Operatore[]
  consulente: string | null
  admin: boolean
  propria: boolean
}) {
  const sett = p.settimane
  const ora = sett[sett.length - 1]
  const scorsa = sett.length >= 2 ? sett[sett.length - 2] : null
  // Le quattro settimane complete prima di quella in corso.
  const quattro = sett.slice(Math.max(0, sett.length - 5), sett.length - 1)

  const punti = (m: Metrica): Punto[] =>
    sett.map((w, i) => ({
      chiave: w.settimana,
      etichetta: giornoMese.format(data(w.settimana)).replace('.', ''),
      titolo: `Settimana dal ${giornoMeseLungo.format(data(w.settimana))} al ${giornoMeseLungo.format(dopo(w.settimana, 6))}${w.in_corso ? ' · in corso' : ''}`,
      valore: valoreDi(m, w),
      tratteggio: w.in_corso,
      righe: [
        {
          colore: 'serie',
          valore: scrivi(m, valoreDi(m, w)),
          etichetta: m.titolo.toLowerCase(),
          nota: m.num && m.den ? `${formatoCifra(m.num(w))} su ${formatoCifra(m.den(w))}` : m.sotto?.(w),
        },
      ],
      piede: [
        ...(i >= 1 ? [{ etichetta: 'Settimana prima', valore: scrivi(m, valoreDi(m, sett[i - 1])) }] : []),
        ...(i >= 4 ? [{ etichetta: 'Media delle 4 prima', valore: scrivi(m, valoreMedio(m, sett.slice(i - 4, i))) }] : []),
      ],
    }))

  const tessere = METRICHE.filter((m) => ['chiuse', 'pass', 'prove', 'venduti', 'ricontatto', 'disdette'].includes(m.chiave))
  const grafici = METRICHE.filter((m) => ['pass', 'prove', 'venduti', 'ricontatto-30'].includes(m.chiave))
  const nome = propria ? 'La mia performance' : `Performance di ${p.consulente ?? 'un consulente'}`

  return (
    <section className="scheda" id="performance">
      <div className="testata-scheda">
        <h2>{nome}</h2>
        {admin && (
          <form className="filtri" action="/dashboard" style={{ margin: 0 }}>
            <select name="consulente" defaultValue={consulente ?? ''} aria-label="Consulente">
              <option value="">Io</option>
              {staff.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome} {o.cognome ?? ''}
                </option>
              ))}
            </select>
            <button className="bottone secondario" type="submit">
              Vedi
            </button>
          </form>
        )}
      </div>
      <p className="piccolo attenuato sotto-titolo">
        Settimana per settimana, da lunedì a domenica. Le percentuali sono sulle opportunità che hai preso in carico in quella settimana:
        quelle vecchie sono complete, quella in corso (tratteggiata) cresce man mano che le opportunità si chiudono. Il confronto è con la
        settimana scorsa e con la media delle quattro settimane prima.
      </p>

      <div className="numeri">
        {tessere.map((m) => {
          const v = valoreDi(m, ora)
          const prima = scorsa ? valoreDi(m, scorsa) : null
          const media = valoreMedio(m, quattro)
          return (
            <div key={m.chiave} className="numero totale" title={m.spiega}>
              <div className="etichetta">{m.titolo}</div>
              <div className="valore">{scrivi(m, v)}</div>
              <div className="nota">{m.num && m.den ? `${formatoCifra(m.num(ora))} su ${formatoCifra(m.den(ora))} questa settimana` : m.sotto ? `${m.sotto(ora)} · questa settimana` : 'questa settimana'}</div>
              <ul className="confronti">
                {[
                  { chi: 'settimana scorsa', v: prima },
                  { chi: 'media delle 4 prima', v: media },
                ].map((c) => {
                  const d = differenza(m, v, c.v)
                  return (
                    <li key={c.chi}>
                      <span className="attenuato">{c.chi}</span> <strong>{scrivi(m, c.v)}</strong>
                      {d && <span className={`bollino ${d.tono}`}> {d.testo}</span>}
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>

      <h3 className="titoletto">Trend settimanale</h3>
      <div className="multipli">
        {grafici.map((m) => (
          <div key={m.chiave} className="multiplo">
            <h3>{m.titolo}</h3>
            <p className="piccolo attenuato">{m.spiega}</p>
            <Colonne
              punti={punti(m)}
              altezza={150}
              formato={m.formato === 'percento' ? 'percento' : 'intero'}
              massimo={m.formato === 'percento' ? 100 : undefined}
              unita={m.formato === 'minuti' ? 'minuti' : m.formato === 'percento' ? 'di conversione' : undefined}
            />
          </div>
        ))}
      </div>

      <details>
        <summary>
          <strong>Tutti i numeri, settimana per settimana</strong>
        </summary>
        <div className="tabella-scorre">
          <table>
            <thead>
              <tr>
                <th>Indice</th>
                {[...sett].reverse().map((w) => (
                  <th key={w.settimana} className="num nowrap">
                    {giornoMese.format(data(w.settimana)).replace('.', '')}
                    {w.in_corso && <span className="attenuato"> · in corso</span>}
                  </th>
                ))}
                <th className="num nowrap">Media delle 4 prima</th>
              </tr>
            </thead>
            <tbody>
              {METRICHE.map((m) => (
                <tr key={m.chiave}>
                  <td title={m.spiega}>{m.titolo}</td>
                  {[...sett].reverse().map((w) => (
                    <td key={w.settimana} className="num">
                      <strong>{scrivi(m, valoreDi(m, w))}</strong>
                      {m.num && m.den && m.den(w) > 0 && (
                        <span className="attenuato">
                          {' '}
                          ({formatoCifra(m.num(w))}/{formatoCifra(m.den(w))})
                        </span>
                      )}
                    </td>
                  ))}
                  <td className="num attenuato">{scrivi(m, valoreMedio(m, quattro))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="piccolo attenuato">
          Le opportunità chiuse da PerfectGym quando compare il contratto contano come chiuse e vinte anche se nessuno le ha ricontattate:
          per questo le «ricontattate» possono essere meno delle prese in carico. Le feste contano come giorni normali nell’orario di lavoro.
        </p>
      </details>
    </section>
  )
}
