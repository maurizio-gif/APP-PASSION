import type { Abbonamenti, DurataPeriodo, Vincolo } from '@/lib/crm'
import { formatoData, formatoFa, formatoNumero } from '@/lib/formato'
import { Colonne, type Punto } from './Colonne'

// La dashboard abbonamenti, disegnata: riceve i numeri di crm_abbonamenti() e
// non ne calcola nessuno (le regole stanno nel database, in
// supabase/migrations/20260928p_dashboard_abbonamenti.sql).

const NOME_VINCOLO: Record<Vincolo, string> = { 1: 'Mensili', 4: 'Quadrimestrali', 12: 'Annuali' }
const DETTAGLIO_VINCOLO: Record<Vincolo, string> = {
  1: 'vincolo 1 mese (Flex)',
  4: 'vincolo minimo 4 mesi',
  12: 'vincolo minimo 12 mesi',
}

const meseCorto = new Intl.DateTimeFormat('it-IT', { month: 'short', timeZone: 'UTC' })
const meseLungo = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const unDecimale = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const mesi1 = (v: number | null | undefined) => (v == null ? '—' : unDecimale.format(v))
const data = (giorno: string) => new Date(`${giorno}T12:00:00Z`)
const segnato = (v: number) => (v > 0 ? `+${formatoNumero(v)}` : formatoNumero(v))

export function VistaAbbonamenti({ d }: { d: Abbonamenti }) {
  const { kpi } = d

  const asseMese = (m: Abbonamenti['mesi'][number], i: number) => {
    const g = data(m.mese)
    return {
      chiave: m.mese,
      etichetta: meseCorto.format(g).replace('.', ''),
      anno: i === 0 || g.getUTCMonth() === 0 ? String(g.getUTCFullYear()) : undefined,
      titolo: `${meseLungo.format(g)}${m.in_corso ? ' (in corso)' : ''}`,
    }
  }

  const attivi: Punto[] = d.mesi.map((m, i) => ({
    ...asseMese(m, i),
    valore: m.attivi,
    tratteggio: m.in_corso,
    righe: [m.in_corso ? `attivi oggi, ${formatoData(d.oggi)}` : 'attivi l’ultimo giorno del mese'],
  }))
  const nuovi: Punto[] = d.mesi.map((m, i) => ({
    ...asseMese(m, i),
    valore: m.nuovi,
    tratteggio: m.in_corso,
    righe: [`più ${formatoNumero(m.rinnovi)} rinnovi, non contati`],
  }))
  const scaduti: Punto[] = d.mesi.map((m, i) => ({
    ...asseMese(m, i),
    valore: m.scaduti,
    tratteggio: m.scaduti_provvisori > 0,
    righe: m.scaduti_provvisori > 0 ? [`${formatoNumero(m.scaduti_provvisori)} finiti da meno di 30 giorni: possono ancora rinnovare`] : [],
  }))
  const saldo: Punto[] = d.mesi.map((m, i) => ({
    ...asseMese(m, i),
    valore: m.nuovi - m.scaduti,
    tratteggio: m.in_corso || m.scaduti_provvisori > 0,
    righe: [`${formatoNumero(m.nuovi)} nuovi − ${formatoNumero(m.scaduti)} scaduti`],
  }))

  const vincoli: Vincolo[] = [1, 4, 12]
  const oltreMassimo = Math.max(1, ...d.durata.trimestri.filter((t) => t.arrivati >= MINIMO).map((t) => t.oltre_medio ?? 0))

  return (
    <>
      <div className="testata">
        <div>
          <h1>Abbonamenti</h1>
          <p>
            Dal mirror di PerfectGym, aggiornato {formatoFa(d.aggiornato_il)}. Conta ogni contratto non aggiuntivo con canone
            sopra lo zero: restano fuori pass, certificati, Wellhub e Fitprime, staff e add-on.
          </p>
        </div>
      </div>

      <div className="numeri-grandi">
        <Totale
          titolo="Abbonamenti attivi"
          ora={kpi.oggi.abbonamenti}
          confronti={[
            { giorno: kpi.anno_fa.giorno, valore: kpi.anno_fa.abbonamenti },
            {
              giorno: kpi.due_anni_fa.giorno,
              valore: kpi.due_anni_fa.abbonamenti,
              nota: kpi.due_anni_fa.old
                ? `Quel giorno c’erano anche ${formatoNumero(kpi.due_anni_fa.old)} soci sui piani OLD a canone zero (dal vecchio gestionale), che qui non contano.`
                : undefined,
            },
          ]}
        />
        <Totale
          titolo="Pass attivi"
          ora={kpi.oggi.pass}
          confronti={[
            { giorno: kpi.anno_fa.giorno, valore: kpi.anno_fa.pass },
            { giorno: kpi.due_anni_fa.giorno, valore: kpi.due_anni_fa.pass },
          ]}
        />
      </div>

      <section className="scheda">
        <h2>Abbonamenti attivi a fine mese</h2>
        <p className="piccolo attenuato sotto-titolo">Ultimi 24 mesi. Il mese in corso (tratteggiato) è contato a oggi.</p>
        <Colonne punti={attivi} unita="attivi" />
      </section>

      <section className="scheda">
        <h2>Nuovi abbonamenti</h2>
        <p className="piccolo attenuato sotto-titolo">
          Per mese di inizio, esclusi i rinnovi: chi aveva già un abbonamento in corso, o finito da meno di 30 giorni, non è
          nuovo. Chi torna dopo più di 30 giorni sì.
        </p>
        <Colonne punti={nuovi} unita="nuovi" />
      </section>

      <section className="scheda">
        <h2>Scaduti e non rinnovati</h2>
        <p className="piccolo attenuato sotto-titolo">
          Per mese di fine: abbonamenti finiti dopo i quali, entro 30 giorni, non ne è partito un altro. Tratteggiati i mesi con
          abbonamenti finiti da meno di 30 giorni, il numero può ancora scendere.
        </p>
        <Colonne punti={scaduti} unita="scaduti" />
      </section>

      <section className="scheda">
        <h2>Saldo del mese</h2>
        <p className="piccolo attenuato sotto-titolo">Nuovi abbonamenti meno scaduti non rinnovati. Sotto lo zero, se ne perdono più di quanti ne entrano.</p>
        <Colonne punti={saldo} formato={segnato} unita="di saldo" />
      </section>

      <section className="scheda">
        <h2>Quanto durano</h2>
        <p className="piccolo attenuato sotto-titolo">
          Gli abbonamenti senza scadenza (Mensile, Flex, Open, Formula 8) che sono stati disdetti e non rinnovati: quanti mesi
          sono durati in tutto e quanti mesi sono rimasti <strong>dopo il vincolo minimo</strong>. I piani a durata fissa (Reformer 5
          e 12 mesi, Percorsi I Love My Trainer) non ci sono: finiscono da soli.
        </p>

        <div className="tabella-scorre">
          <table>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Periodo di disdetta</th>
                <th className="num">Disdetti</th>
                <th className="num">Durata media</th>
                <th className="num">Mesi oltre il vincolo</th>
                <th className="num">Usciti prima del vincolo</th>
              </tr>
            </thead>
            <tbody>
              {d.durata.riepilogo.map((r) => (
                <RigheDurata key={r.vincolo} vincolo={r.vincolo} ultimi={r.periodi.ultimi_12} precedenti={r.periodi.precedenti_12} />
              ))}
            </tbody>
          </table>
        </div>
        <p className="piccolo attenuato">
          «Mesi oltre il vincolo» è la media su chi il vincolo l’ha finito; chi è uscito prima (cambio piano, recesso) è contato a
          parte. Ancora dentro, oggi:{' '}
          {d.durata.riepilogo
            .map((r) => `${NOME_VINCOLO[r.vincolo].toLowerCase()} ${formatoNumero(r.attivi)}, di cui ${formatoNumero(r.attivi_oltre)} già oltre il vincolo da ${mesi1(r.attivi_oltre_mesi)} mesi in media`)
            .join('; ')}
          .
        </p>

        <h3 className="titoletto">Mesi oltre il vincolo, per trimestre di disdetta</h3>
        <div className="multipli">
          {vincoli.map((v) => {
            const righe = d.durata.trimestri.filter((t) => t.vincolo === v)
            const punti: Punto[] = righe.map((t, i) => {
              const g = data(t.trimestre)
              const q = Math.floor(g.getUTCMonth() / 3) + 1
              return {
                chiave: t.trimestre,
                etichetta: `T${q}`,
                anno: i === 0 || q === 1 ? String(g.getUTCFullYear()) : undefined,
                titolo: `${q}° trimestre ${g.getUTCFullYear()}${t.in_corso ? ' (in corso)' : ''}`,
                valore: t.arrivati >= MINIMO ? t.oltre_medio : null,
                tratteggio: t.in_corso,
                righe: [
                  `${formatoNumero(t.disdetti)} disdetti, durata media ${mesi1(t.durata_media)} mesi`,
                  `${formatoNumero(t.anticipati)} usciti prima del vincolo`,
                ],
              }
            })
            return (
              <div key={v} className="multiplo">
                <h3>{NOME_VINCOLO[v]}</h3>
                <p className="piccolo attenuato">{DETTAGLIO_VINCOLO[v]}</p>
                <Colonne punti={punti} altezza={150} massimo={oltreMassimo} formato={mesi1} unita="mesi oltre il vincolo" vuoto={`meno di ${MINIMO} arrivati al vincolo`} />
              </div>
            )
          })}
        </div>
        <p className="piccolo attenuato">
          Gli abbonamenti a pagamento su PerfectGym partono da luglio 2024: un annuale non può aver finito il vincolo prima
          dell’estate 2025, e le durate più lunghe di due anni ancora non si vedono. Senza colonna i trimestri con meno di{' '}
          {MINIMO} disdetti arrivati al vincolo.
        </p>
      </section>

      <details className="scheda">
        <summary>
          <strong>I numeri mese per mese</strong>
        </summary>
        <div className="tabella-scorre">
          <table>
            <thead>
              <tr>
                <th>Mese</th>
                <th className="num">Attivi a fine mese</th>
                <th className="num">Nuovi</th>
                <th className="num">Rinnovi</th>
                <th className="num">Scaduti non rinnovati</th>
                <th className="num">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {[...d.mesi].reverse().map((m) => (
                <tr key={m.mese}>
                  <td className="nowrap">
                    {meseLungo.format(data(m.mese))}
                    {m.in_corso && <span className="attenuato"> · in corso</span>}
                  </td>
                  <td className="num">{formatoNumero(m.attivi)}</td>
                  <td className="num">{formatoNumero(m.nuovi)}</td>
                  <td className="num">{formatoNumero(m.rinnovi)}</td>
                  <td className="num">
                    {formatoNumero(m.scaduti)}
                    {m.scaduti_provvisori > 0 && <span className="attenuato"> ({formatoNumero(m.scaduti_provvisori)} provvisori)</span>}
                  </td>
                  <td className="num">{segnato(m.nuovi - m.scaduti)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  )
}

// Sotto questa soglia la media di un trimestre dice poco.
const MINIMO = 10

function Totale({ titolo, ora, confronti }: { titolo: string; ora: number; confronti: { giorno: string; valore: number; nota?: string }[] }) {
  return (
    <div className="numero totale">
      <div className="etichetta">{titolo}</div>
      <div className="valore">{formatoNumero(ora)}</div>
      <div className="nota">oggi</div>
      <ul className="confronti">
        {confronti.map((c) => {
          const diff = ora - c.valore
          const perc = c.valore ? Math.round((diff / c.valore) * 100) : null
          return (
            <li key={c.giorno}>
              <span className="attenuato">il {formatoData(c.giorno)}</span> <strong>{formatoNumero(c.valore)}</strong>{' '}
              <span className={`bollino ${diff > 0 ? 'verde' : diff < 0 ? 'rosso' : 'grigio'}`}>
                {diff > 0 ? '▲' : diff < 0 ? '▼' : '='} {segnato(diff)}
                {perc != null && diff !== 0 ? ` · ${perc > 0 ? '+' : ''}${perc}%` : ''}
              </span>
              {c.nota && <div className="piccolo attenuato">{c.nota}</div>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function RigheDurata({ vincolo, ultimi, precedenti }: { vincolo: Vincolo; ultimi: DurataPeriodo; precedenti: DurataPeriodo }) {
  const riga = (p: DurataPeriodo, periodo: string, prima: boolean) => (
    <tr key={periodo}>
      {prima && (
        <td rowSpan={2}>
          <strong>{NOME_VINCOLO[vincolo]}</strong>
          <div className="piccolo attenuato">{DETTAGLIO_VINCOLO[vincolo]}</div>
        </td>
      )}
      <td className="nowrap">{periodo}</td>
      <td className="num">{formatoNumero(p.disdetti)}</td>
      <td className="num">{p.durata_media == null ? '—' : `${mesi1(p.durata_media)} mesi`}</td>
      <td className="num">
        <strong>{p.oltre_medio == null ? '—' : `${p.oltre_medio > 0 ? '+' : ''}${mesi1(p.oltre_medio)}`}</strong>
        <span className="attenuato"> su {formatoNumero(p.arrivati)}</span>
      </td>
      <td className="num">
        {formatoNumero(p.anticipati)}
        {p.disdetti > 0 && <span className="attenuato"> · {Math.round((p.anticipati / p.disdetti) * 100)}%</span>}
      </td>
    </tr>
  )
  return (
    <>
      {riga(ultimi, 'ultimi 12 mesi', true)}
      {riga(precedenti, '12 mesi prima', false)}
    </>
  )
}
