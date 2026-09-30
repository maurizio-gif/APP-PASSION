import type { Abbonamenti, DurataPeriodo, Vincolo } from '@/lib/crm'
import { formatoCifra, formatoData, formatoFa } from '@/lib/formato'
import { Colonne, type Punto } from './Colonne'
import { LinkGuida } from './Ui'

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
const mesi1 = (v: number | null | undefined) => formatoCifra(v, 1)
const data = (giorno: string) => new Date(`${giorno}T12:00:00Z`)
const segnato = (v: number) => (v > 0 ? `+${formatoCifra(v)}` : formatoCifra(v))
const quota = (parte: number, tutto: number) => (tutto ? `${Math.round((parte / tutto) * 100)}% del totale` : undefined)
// "+434 · +22%"; senza la percentuale quando non vuol dire niente (il saldo).
// La differenza fra due percentuali, in punti: "+4 punti".
function punti(ora: number | null, prima: number | null) {
  if (ora == null || prima == null) return '—'
  const diff = ora - prima
  return `${segnato(diff)} ${Math.abs(diff) === 1 ? 'punto' : 'punti'}`
}

function variazione(ora: number, prima: number, conPercentuale = true) {
  const diff = ora - prima
  if (!prima || !conPercentuale) return segnato(diff)
  return `${segnato(diff)} · ${segnato(Math.round((diff / Math.abs(prima)) * 100))}%`
}

export function VistaAbbonamenti({ d }: { d: Abbonamenti }) {
  const { kpi } = d

  // Ogni mese col suo nome, e sotto l'anno: si legge anche scorrendo.
  const asseMese = (m: { mese: string; in_corso: boolean }) => {
    const g = data(m.mese)
    return {
      chiave: m.mese,
      etichetta: meseCorto.format(g).replace('.', ''),
      anno: String(g.getUTCFullYear()).slice(2),
      titolo: `${meseLungo.format(g)}${m.in_corso ? ' · in corso' : ''}`,
    }
  }
  // Il confronto col mese prima e con lo stesso mese dell'anno prima.
  const confronti = (i: number, di: (m: Abbonamenti['mesi'][number]) => number, conPercentuale = true) => {
    const piede: { etichetta: string; valore: string }[] = []
    if (i >= 1) piede.push({ etichetta: 'Rispetto al mese prima', valore: variazione(di(d.mesi[i]), di(d.mesi[i - 1]), conPercentuale) })
    if (i >= 12) piede.push({ etichetta: 'Rispetto a un anno prima', valore: variazione(di(d.mesi[i]), di(d.mesi[i - 12]), conPercentuale) })
    return piede
  }

  const attivi: Punto[] = d.mesi.map((m, i) => ({
    ...asseMese(m),
    valore: m.attivi,
    tratteggio: m.in_corso,
    righe: [
      {
        colore: 'serie',
        valore: formatoCifra(m.attivi),
        etichetta: 'abbonamenti attivi',
        nota: m.in_corso ? `contati a oggi, ${formatoData(d.oggi)}` : 'l’ultimo giorno del mese',
      },
    ],
    piede: confronti(i, (x) => x.attivi),
  }))
  const nuovi: Punto[] = d.mesi.map((m, i) => ({
    ...asseMese(m),
    valore: m.nuovi,
    tratteggio: m.in_corso,
    righe: [
      { colore: 'serie', valore: formatoCifra(m.nuovi), etichetta: 'nuovi', nota: quota(m.nuovi, m.nuovi + m.rinnovi) },
      { colore: 'tenue', valore: formatoCifra(m.rinnovi), etichetta: 'rinnovi, non contati', nota: quota(m.rinnovi, m.nuovi + m.rinnovi) },
    ],
    piede: [{ etichetta: 'Partiti nel mese', valore: formatoCifra(m.nuovi + m.rinnovi) }, ...confronti(i, (x) => x.nuovi)],
  }))
  const scaduti: Punto[] = d.mesi.map((m, i) => ({
    ...asseMese(m),
    valore: m.scaduti,
    tratteggio: m.scaduti_provvisori > 0,
    righe: [
      { colore: 'serie', valore: formatoCifra(m.scaduti), etichetta: 'scaduti non rinnovati', nota: 'nessun abbonamento nei 30 giorni dopo' },
      ...(m.scaduti_provvisori > 0
        ? [{ colore: 'tenue' as const, valore: formatoCifra(m.scaduti_provvisori), etichetta: 'ancora provvisori', nota: 'finiti da meno di 30 giorni: possono rinnovare' }]
        : []),
    ],
    piede: confronti(i, (x) => x.scaduti),
  }))
  const saldo: Punto[] = d.mesi.map((m, i) => ({
    ...asseMese(m),
    valore: m.nuovi - m.scaduti,
    tratteggio: m.in_corso || m.scaduti_provvisori > 0,
    righe: [
      { colore: 'serie', valore: formatoCifra(m.nuovi), etichetta: 'nuovi' },
      { colore: 'negativa', valore: formatoCifra(m.scaduti), etichetta: 'scaduti non rinnovati' },
    ],
    piede: [{ etichetta: 'Saldo', valore: segnato(m.nuovi - m.scaduti) }, ...confronti(i, (x) => x.nuovi - x.scaduti, false)],
  }))

  // I pass di prova: per persona, quante finiscono la prova e quante si abbonano.
  const tasso = (conv: number, tot: number) => (tot ? Math.round((conv / tot) * 100) : null)
  const percento = (conv: number, tot: number) => `${tasso(conv, tot) ?? '—'}%`
  const prove: Punto[] = d.mesi.map((m, i) => {
    const non = m.prove - m.prove_abbonati
    const giornalieri = m.prove - m.prove_guest
    const giornalieriAbbonati = m.prove_abbonati - m.prove_guest_abbonati
    return {
      ...asseMese(m),
      valore: m.prove,
      tratteggio: m.prove_provvisori > 0,
      parti: [
        { valore: m.prove_abbonati, colore: 'serie' },
        { valore: non, colore: 'tenue' },
      ],
      righe: [
        {
          colore: 'serie',
          valore: formatoCifra(m.prove_abbonati),
          etichetta: 'si sono abbonate',
          nota: `${percento(m.prove_abbonati, m.prove)}${m.prove_giorni != null ? ` · in media ${formatoCifra(m.prove_giorni)} giorni dall’inizio della prova` : ''}`,
        },
        {
          colore: 'tenue',
          valore: formatoCifra(non),
          etichetta: 'non abbonate',
          nota: m.prove_provvisori > 0 ? `${formatoCifra(m.prove_provvisori)} hanno finito da meno di 30 giorni: possono ancora abbonarsi` : undefined,
        },
      ],
      piede: [
        { etichetta: 'Persone in prova', valore: formatoCifra(m.prove) },
        { etichetta: 'Con un Guest Pass', valore: `${formatoCifra(m.prove_guest_abbonati)} su ${formatoCifra(m.prove_guest)} · ${percento(m.prove_guest_abbonati, m.prove_guest)}` },
        { etichetta: 'Solo pass giornalieri', valore: `${formatoCifra(giornalieriAbbonati)} su ${formatoCifra(giornalieri)} · ${percento(giornalieriAbbonati, giornalieri)}` },
        { etichetta: 'Pass attivati', valore: formatoCifra(m.prove_pass) },
        ...(m.prove_piu_pass > 0 ? [{ etichetta: 'Persone con più di un pass', valore: formatoCifra(m.prove_piu_pass) }] : []),
        ...(i >= 12 ? [{ etichetta: 'Un anno prima', valore: `${formatoCifra(d.mesi[i - 12].prove_abbonati)} su ${formatoCifra(d.mesi[i - 12].prove)} · ${percento(d.mesi[i - 12].prove_abbonati, d.mesi[i - 12].prove)}` }] : []),
      ],
    }
  })
  const conversione: Punto[] = d.mesi.map((m, i) => ({
    ...asseMese(m),
    valore: tasso(m.prove_abbonati, m.prove),
    tratteggio: m.prove_provvisori > 0,
    righe: [
      {
        colore: 'serie',
        valore: percento(m.prove_abbonati, m.prove),
        etichetta: 'si abbonano',
        nota: `${formatoCifra(m.prove_abbonati)} persone su ${formatoCifra(m.prove)} che hanno finito la prova`,
      },
    ],
    piede: [
      { etichetta: 'Con un Guest Pass', valore: percento(m.prove_guest_abbonati, m.prove_guest) },
      { etichetta: 'Solo pass giornalieri', valore: percento(m.prove_abbonati - m.prove_guest_abbonati, m.prove - m.prove_guest) },
      ...(i >= 1 ? [{ etichetta: 'Rispetto al mese prima', valore: punti(tasso(m.prove_abbonati, m.prove), tasso(d.mesi[i - 1].prove_abbonati, d.mesi[i - 1].prove)) }] : []),
      ...(i >= 12 ? [{ etichetta: 'Rispetto a un anno prima', valore: punti(tasso(m.prove_abbonati, m.prove), tasso(d.mesi[i - 12].prove_abbonati, d.mesi[i - 12].prove)) }] : []),
    ],
  }))
  // La retention: degli iscritti del mese, quanti lo erano anche lo stesso
  // giorno di un anno prima, senza interruzioni (pause fino a 30 giorni
  // comprese). Nel riquadro anche l'altra lettura: di chi c'era un anno prima,
  // quanti ci sono ancora.
  const ret = d.retention ?? []
  const retention: Punto[] = ret.map((r, i) => ({
    ...asseMese(r),
    valore: tasso(r.da_un_anno, r.iscritti),
    tratteggio: r.in_corso,
    righe: [
      {
        colore: 'serie',
        valore: percento(r.da_un_anno, r.iscritti),
        etichetta: 'iscritti da almeno un anno',
        nota: `${formatoCifra(r.da_un_anno)} dei ${formatoCifra(r.iscritti)} iscritti ${r.in_corso ? 'oggi' : `il ${formatoData(r.giorno)}`} lo erano anche il ${formatoData(r.giorno_anno_prima)}, senza interruzioni`,
      },
    ],
    piede: [
      { etichetta: `Iscritti il ${formatoData(r.giorno_anno_prima)}`, valore: formatoCifra(r.anno_prima) },
      { etichetta: 'Di loro, ancora iscritti senza interruzioni', valore: `${formatoCifra(r.da_un_anno)} · ${percento(r.da_un_anno, r.anno_prima)}` },
      ...(i >= 1 ? [{ etichetta: 'Rispetto al mese prima', valore: punti(tasso(r.da_un_anno, r.iscritti), tasso(ret[i - 1].da_un_anno, ret[i - 1].iscritti)) }] : []),
      ...(i >= 12 ? [{ etichetta: 'Rispetto a un anno prima', valore: punti(tasso(r.da_un_anno, r.iscritti), tasso(ret[i - 12].da_un_anno, ret[i - 12].iscritti)) }] : []),
    ],
  }))

  // Gli ultimi 12 mesi contro i 12 prima, in tutto e per tipo di pass.
  const somma = (mesi: Abbonamenti['mesi']) => {
    const t = mesi.reduce(
      (a, m) => ({
        persone: a.persone + m.prove,
        abbonati: a.abbonati + m.prove_abbonati,
        guest: a.guest + m.prove_guest,
        guestAbbonati: a.guestAbbonati + m.prove_guest_abbonati,
      }),
      { persone: 0, abbonati: 0, guest: 0, guestAbbonati: 0 },
    )
    return {
      tutti: { persone: t.persone, abbonati: t.abbonati },
      guest: { persone: t.guest, abbonati: t.guestAbbonati },
      giornalieri: { persone: t.persone - t.guest, abbonati: t.abbonati - t.guestAbbonati },
    }
  }
  const proveUltimi = somma(d.mesi.slice(12))
  const provePrima = somma(d.mesi.slice(0, 12))
  const proveProvvisori = d.mesi.reduce((a, m) => a + m.prove_provvisori, 0)

  const vincoli: Vincolo[] = [1, 4, 12]
  const oltreMassimo = Math.max(1, ...d.durata.trimestri.filter((t) => t.arrivati >= MINIMO).map((t) => t.oltre_medio ?? 0))

  return (
    <>
      <div className="testata">
        <div>
          <h1>Abbonamenti</h1>
          <p>
            Dal mirror di PerfectGym, aggiornato {formatoFa(d.aggiornato_il)}. Conta ogni contratto non aggiuntivo con canone
            sopra lo zero: restano fuori pass, certificati, Wellhub e Fitprime, staff e add-on.{' '}
            <LinkGuida argomento="abbonamenti" />
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
                ? `Quel giorno c’erano anche ${formatoCifra(kpi.due_anni_fa.old)} soci sui piani OLD a canone zero (dal vecchio gestionale), che qui non contano.`
                : undefined,
            },
          ]}
        />
        <Totale
          titolo="Pass attivi · persone"
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
        <Colonne punti={saldo} formato="segno" unita="di saldo" />
      </section>

      {retention.length > 0 && (
        <section className="scheda">
          <h2>Retention</h2>
          <p className="piccolo attenuato sotto-titolo">
            Su base annuale: degli iscritti di ogni mese, quanti erano iscritti anche lo stesso giorno dell&apos;anno prima,{' '}
            <strong>senza interruzioni</strong> (settembre 2026 contro settembre 2025, agosto 2026 contro agosto 2025…). Iscritto è chi ha
            un abbonamento principale: non aggiuntivo, a pagamento o dei piani OLD del vecchio gestionale. Un cambio di abbonamento o una
            pausa breve non interrompono: basta ripartire entro 30 giorni dalla fine del precedente, come per i rinnovi. L&apos;ultimo
            giorno del mese; il mese in corso (tratteggiato) è contato a oggi.
          </p>
          <Colonne punti={retention} formato="percento" massimo={100} altezza={160} unita="di retention" />
          <p className="piccolo attenuato">
            Quando i soci crescono, la retention scende anche se nessuno se ne va: un anno prima c&apos;erano meno persone da trattenere.
            Nel riquadro di ogni mese c&apos;è anche l&apos;altra lettura: di chi c&apos;era un anno prima, quanti ci sono ancora.
          </p>
        </section>
      )}

      <section className="scheda">
        <h2>Pass di prova: quanti diventano abbonamento</h2>
        <p className="piccolo attenuato sotto-titolo">
          Guest Pass e Pass giornalieri (Reformer, Sala Pesi, Corsi Fitness, Crossfit…), contati per <strong>persona</strong>: chi
          attiva più pass conta una volta, e i suoi pass a meno di 30 giorni l’uno dall’altro sono una prova sola. Per mese di
          fine della prova: quante persone l’hanno finita e quante si sono abbonate, durante la prova o entro 30 giorni. Non
          contano i pass di chi era già abbonato.
        </p>
        <div className="numeri-guest">
          <ConfrontoProve titolo="Tutte le prove" ora={proveUltimi.tutti} prima={provePrima.tutti} />
          <ConfrontoProve titolo="Con un Guest Pass" ora={proveUltimi.guest} prima={provePrima.guest} />
          <ConfrontoProve titolo="Solo pass giornalieri" ora={proveUltimi.giornalieri} prima={provePrima.giornalieri} />
        </div>
        <p className="piccolo attenuato">
          Ultimi 12 mesi, contro i 12 mesi prima.
          {proveProvvisori > 0 ? ` ${formatoCifra(proveProvvisori)} persone hanno finito da meno di 30 giorni e possono ancora abbonarsi.` : ''}
        </p>
        <h3 className="titoletto">Persone che hanno finito la prova</h3>
        <Colonne punti={prove} unita="persone in prova" />
        <div className="legenda" aria-hidden>
          <span>
            <span className="quadratino serie" /> abbonate entro 30 giorni
          </span>
          <span>
            <span className="quadratino tenue" /> non abbonate
          </span>
        </div>
        <h3 className="titoletto">Quante si abbonano, in percentuale</h3>
        <Colonne punti={conversione} formato="percento" massimo={100} altezza={160} unita="di conversione" />
      </section>

      <section className="scheda">
        <h2>Quanto durano</h2>
        <p className="piccolo attenuato sotto-titolo">
          Quanto resta chi entra con un abbonamento senza scadenza (Mensile, Flex, Open, Formula 8), e quanti mesi rimane{' '}
          <strong>dopo il vincolo minimo</strong> prima di andarsene. I cambi contano: un mensile che passa al quadrimestrale, un
          quadrimestrale che passa all’annuale, un annuale che cambia piano restano la stessa permanenza, dal primo giorno del
          primo abbonamento all’ultimo dell’ultimo (con al massimo 30 giorni di vuoto). Il tipo è quello con cui la persona è
          entrata.
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
                <th className="num">Con cambio piano</th>
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
          «Mesi oltre il vincolo» è la media su chi il vincolo l’ha finito; chi se n’è andato prima (recesso) è contato a parte. Ancora dentro, oggi:{' '}
          {d.durata.riepilogo
            .map((r) => `${NOME_VINCOLO[r.vincolo].toLowerCase()} ${formatoCifra(r.attivi)}, di cui ${formatoCifra(r.attivi_oltre)} già oltre il vincolo da ${mesi1(r.attivi_oltre_mesi)} mesi in media`)
            .join('; ')}
          .
        </p>

        <h3 className="titoletto">Mesi oltre il vincolo, per trimestre di disdetta</h3>
        <div className="multipli">
          {vincoli.map((v) => {
            const righe = d.durata.trimestri.filter((t) => t.vincolo === v)
            const punti: Punto[] = righe.map((t) => {
              const g = data(t.trimestre)
              const q = Math.floor(g.getUTCMonth() / 3) + 1
              return {
                chiave: t.trimestre,
                etichetta: `T${q}`,
                anno: String(g.getUTCFullYear()).slice(2),
                titolo: `${q}° trimestre ${g.getUTCFullYear()}${t.in_corso ? ' · in corso' : ''}`,
                valore: t.arrivati >= MINIMO ? t.oltre_medio : null,
                tratteggio: t.in_corso,
                righe: [
                  {
                    colore: 'serie',
                    valore: t.oltre_medio == null ? '—' : `${t.oltre_medio > 0 ? '+' : ''}${mesi1(t.oltre_medio)} mesi`,
                    etichetta: 'oltre il vincolo',
                    nota: `media su ${formatoCifra(t.arrivati)} arrivati al vincolo${t.arrivati < MINIMO ? ': troppo pochi' : ''}`,
                  },
                  { colore: 'tenue', valore: formatoCifra(t.anticipati), etichetta: 'usciti prima del vincolo', nota: quota(t.anticipati, t.disdetti) },
                  { valore: formatoCifra(t.con_cambio), etichetta: 'con un cambio di piano', nota: quota(t.con_cambio, t.disdetti) },
                ],
                piede: [
                  { etichetta: 'Disdetti', valore: formatoCifra(t.disdetti) },
                  { etichetta: 'Durata media', valore: t.durata_media == null ? '—' : `${mesi1(t.durata_media)} mesi` },
                ],
              }
            })
            return (
              <div key={v} className="multiplo">
                <h3>{NOME_VINCOLO[v]}</h3>
                <p className="piccolo attenuato">{DETTAGLIO_VINCOLO[v]}</p>
                <Colonne punti={punti} altezza={150} massimo={oltreMassimo} formato="mesi" unita="mesi oltre il vincolo" vuoto={`meno di ${MINIMO} arrivati al vincolo`} />
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
                  <td className="num">{formatoCifra(m.attivi)}</td>
                  <td className="num">{formatoCifra(m.nuovi)}</td>
                  <td className="num">{formatoCifra(m.rinnovi)}</td>
                  <td className="num">
                    {formatoCifra(m.scaduti)}
                    {m.scaduti_provvisori > 0 && <span className="attenuato"> ({formatoCifra(m.scaduti_provvisori)} provvisori)</span>}
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
      <div className="valore">{formatoCifra(ora)}</div>
      <div className="nota">oggi</div>
      <ul className="confronti">
        {confronti.map((c) => {
          const diff = ora - c.valore
          const perc = c.valore ? Math.round((diff / c.valore) * 100) : null
          return (
            <li key={c.giorno}>
              <span className="attenuato">il {formatoData(c.giorno)}</span> <strong>{formatoCifra(c.valore)}</strong>{' '}
              <span className={`bollino ${diff > 0 ? 'verde' : diff < 0 ? 'rosso' : 'grigio'}`}>
                {diff > 0 ? '▲' : diff < 0 ? '▼' : '='} {segnato(diff)}
                {perc != null && diff !== 0 ? ` · ${segnato(perc)}%` : ''}
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
      <td className="num">{formatoCifra(p.disdetti)}</td>
      <td className="num">{p.durata_media == null ? '—' : `${mesi1(p.durata_media)} mesi`}</td>
      <td className="num">
        <strong>{p.oltre_medio == null ? '—' : `${p.oltre_medio > 0 ? '+' : ''}${mesi1(p.oltre_medio)}`}</strong>
        <span className="attenuato"> su {formatoCifra(p.arrivati)}</span>
      </td>
      <td className="num">
        {formatoCifra(p.anticipati)}
        {p.disdetti > 0 && <span className="attenuato"> · {Math.round((p.anticipati / p.disdetti) * 100)}%</span>}
      </td>
      <td className="num">
        {formatoCifra(p.con_cambio)}
        {p.disdetti > 0 && <span className="attenuato"> · {Math.round((p.con_cambio / p.disdetti) * 100)}%</span>}
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

function ConfrontoProve({ titolo, ora, prima }: { titolo: string; ora: { persone: number; abbonati: number }; prima: { persone: number; abbonati: number } }) {
  const t = ora.persone ? Math.round((ora.abbonati / ora.persone) * 100) : null
  const p = prima.persone ? Math.round((prima.abbonati / prima.persone) * 100) : null
  return (
    <div className="numero">
      <div className="etichetta">{titolo}</div>
      <div className="valore">{t == null ? '—' : `${t}%`}</div>
      <div className="nota">
        {formatoCifra(ora.abbonati)} abbonate su {formatoCifra(ora.persone)} persone
      </div>
      <div className="nota">
        12 mesi prima {p == null ? '—' : `${p}%`}
        {t != null && p != null && (
          <>
            {' '}
            <span className={`bollino ${t > p ? 'verde' : t < p ? 'rosso' : 'grigio'}`}>
              {t > p ? '▲' : t < p ? '▼' : '='} {punti(t, p)}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
