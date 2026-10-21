import type { PercorsoMarketing, RigaMarketing } from '@/lib/crm'
import { formatoCifra } from '@/lib/formato'
import { BollinoFonte } from './Ui'

// Il report marketing, disegnato: riceve i numeri di crm_report_marketing() e
// non ne calcola nessuno, a parte le percentuali (le regole di chi e'
// qualificato, in prova o iscritto stanno nel database, in
// supabase/migrations/20261020a_report_marketing.sql).

// Percentuale intera; un decimale sotto il 10%, dove un punto in piu' o in meno si vede.
export function perc(parte: number, tutto: number) {
  if (!tutto) return '—'
  const v = (parte / tutto) * 100
  return `${formatoCifra(v, v > 0 && v < 10 ? 1 : 0)}%`
}

// Le ore, a parole: "5 ore", "3 giorni".
export function durata(ore: number | null) {
  if (ore == null) return '—'
  if (ore < 1) return 'meno di un’ora'
  if (ore < 48) return `${formatoCifra(Math.round(ore))} ${Math.round(ore) === 1 ? 'ora' : 'ore'}`
  return `${formatoCifra(Math.round(ore / 24))} giorni`
}

const larghezza = (parte: number, tutto: number) => (tutto ? Math.max((parte / tutto) * 100, parte > 0 ? 1 : 0) : 0)

export function PercorsoLead({ t }: { t: PercorsoMarketing }) {
  const senzaProva = t.iscritti - t.iscritti_dopo_prova
  const passi = [
    { nome: 'Opportunità', nota: 'arrivate nel periodo', n: t.lead, pieno: [{ n: t.lead, classe: '' }] },
    { nome: 'Qualificati', nota: 'hanno risposto', n: t.qualificati, pieno: [{ n: t.qualificati, classe: '' }] },
    { nome: 'Prova attivata', nota: 'passaggio facoltativo', n: t.prove, pieno: [{ n: t.prove, classe: '' }] },
    {
      nome: 'Iscritti',
      nota: 'con o senza prova',
      n: t.iscritti,
      pieno: [
        { n: senzaProva, classe: '' },
        { n: t.iscritti_dopo_prova, classe: 'dopo-prova' },
      ],
    },
  ]
  return (
    <div className="percorso">
      {passi.map((p, i) => (
        <div className="percorso-passo" key={p.nome}>
          <div className="percorso-nome">
            {p.nome}
            <small>{p.nota}</small>
          </div>
          <div className="percorso-barra" role="img" aria-label={`${p.nome}: ${formatoCifra(p.n)}`}>
            {p.pieno.map((s, k) => (
              <span key={k} className={`percorso-pieno ${s.classe}`} style={{ width: `${larghezza(s.n, t.lead)}%` }} />
            ))}
          </div>
          <div className="percorso-cifre">
            <strong>{formatoCifra(p.n)}</strong>
            {i > 0 && (
              <small>
                {perc(p.n, t.lead)} delle opportunità
                {i > 1 && ` · ${perc(p.n, t.qualificati)} dei qualificati`}
              </small>
            )}
          </div>
        </div>
      ))}
      {t.iscritti > 0 && (
        <p className="piccolo attenuato percorso-legenda">
          <span className="percorso-chiave" /> iscritti senza prova: {formatoCifra(senzaProva)}
          <span className="percorso-chiave dopo-prova" /> iscritti dopo una prova: {formatoCifra(t.iscritti_dopo_prova)}
        </p>
      )}
    </div>
  )
}

// "2026-10-01" -> "Ottobre 2026".
const meseLungo = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const maiuscola = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function Voce({ riga, dimensione }: { riga: RigaMarketing; dimensione: string }) {
  if (dimensione === 'fonte') return <BollinoFonte fonte={riga.etichetta} />
  if (dimensione === 'mese') return <strong>{maiuscola(meseLungo.format(new Date(`${riga.etichetta}T12:00:00Z`)))}</strong>
  if (dimensione === 'campagna')
    return (
      <>
        <BollinoFonte fonte={riga.fonte} /> {riga.etichetta}
      </>
    )
  if (dimensione === 'attivita') return <>{maiuscola(riga.etichetta)}</>
  return <>{riga.etichetta}</>
}

const Cifra = ({ n, base }: { n: number; base: number }) => (
  <td className="num">
    {formatoCifra(n)}
    <span className="perc">{perc(n, base)}</span>
  </td>
)

export function TabellaPercorsi({ righe, totale, dimensione, voce }: {
  righe: RigaMarketing[]
  totale: PercorsoMarketing
  dimensione: string
  voce: string
}) {
  return (
    <div className="tabella-scorre">
      <table className="tabella-marketing">
        <thead>
          <tr>
            <th>{voce}</th>
            <th className="num">Opportunità</th>
            <th className="num">Qualificati</th>
            <th className="num">Prova attivata</th>
            <th className="num">Iscritti</th>
            <th className="num">di cui dopo prova</th>
          </tr>
        </thead>
        <tbody>
          {righe.map((r) => (
            <tr key={`${r.fonte ?? ''}|${r.etichetta}`}>
              <td className="voce"><Voce riga={r} dimensione={dimensione} /></td>
              <td className="num">{formatoCifra(r.lead)}</td>
              <Cifra n={r.qualificati} base={r.lead} />
              <Cifra n={r.prove} base={r.lead} />
              <Cifra n={r.iscritti} base={r.lead} />
              <td className="num">{formatoCifra(r.iscritti_dopo_prova)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>Totale</td>
            <td className="num">{formatoCifra(totale.lead)}</td>
            <Cifra n={totale.qualificati} base={totale.lead} />
            <Cifra n={totale.prove} base={totale.lead} />
            <Cifra n={totale.iscritti} base={totale.lead} />
            <td className="num">{formatoCifra(totale.iscritti_dopo_prova)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

// Come vengono gestiti i lead: i numeri che dicono se il lead e' stato
// lavorato, quante volte e quanto in fretta.
function Numero({ etichetta, valore, nota }: { etichetta: string; valore: string; nota: string }) {
  return (
    <div className="numero">
      <div className="etichetta">{etichetta}</div>
      <div className="valore">{valore}</div>
      <div className="nota">{nota}</div>
    </div>
  )
}

const mediaAzioni = (t: PercorsoMarketing) => (t.lavorati ? formatoCifra(t.azioni / t.lavorati, 1) : '—')

export function GestioneNumeri({ t }: { t: PercorsoMarketing }) {
  return (
    <div className="numeri">
      <Numero etichetta="Nessuno le ha lavorate" valore={perc(t.mai_lavorati, t.lead)} nota={`${formatoCifra(t.mai_lavorati)} opportunità senza task né commenti, né prova né iscrizione`} />
      <Numero etichetta="Provate, mai risposto" valore={perc(t.senza_risposta, t.lead)} nota={`${formatoCifra(t.senza_risposta)} opportunità lavorate ma mai arrivate a rispondere`} />
      <Numero etichetta="Azioni per opportunità" valore={mediaAzioni(t)} nota="task fatti e commenti, in media, sulle opportunità lavorate" />
      <Numero etichetta="Primo contatto" valore={durata(t.primo_contatto_ore)} nota="tempo tipico dall’arrivo al primo task o commento" />
      <Numero etichetta="Entro 24 ore" valore={perc(t.entro_24h, t.lead)} nota={`${formatoCifra(t.entro_24h)} opportunità con la prima azione entro un giorno`} />
      <Numero etichetta="Perse" valore={perc(t.persi, t.lead)} nota={`${formatoCifra(t.persi)} perse, ${formatoCifra(t.aperti)} ancora aperte`} />
    </div>
  )
}

export function TabellaGestione({ righe, totale, dimensione, voce }: {
  righe: RigaMarketing[]
  totale: PercorsoMarketing
  dimensione: string
  voce: string
}) {
  return (
    <div className="tabella-scorre">
      <table className="tabella-marketing">
        <thead>
          <tr>
            <th>{voce}</th>
            <th className="num">Opportunità</th>
            <th className="num">Nessuno le ha lavorate</th>
            <th className="num">Azioni per opportunità</th>
            <th className="num">Primo contatto</th>
            <th className="num">Entro 24 ore</th>
            <th className="num">Provate, mai risposto</th>
            <th className="num">Perse</th>
            <th className="num">Ancora aperte</th>
          </tr>
        </thead>
        <tbody>
          {righe.map((r) => (
            <tr key={`${r.fonte ?? ''}|${r.etichetta}`}>
              <td className="voce"><Voce riga={r} dimensione={dimensione} /></td>
              <td className="num">{formatoCifra(r.lead)}</td>
              <Cifra n={r.mai_lavorati} base={r.lead} />
              <td className="num">{mediaAzioni(r)}</td>
              <td className="num">{durata(r.primo_contatto_ore)}</td>
              <Cifra n={r.entro_24h} base={r.lead} />
              <Cifra n={r.senza_risposta} base={r.lead} />
              <Cifra n={r.persi} base={r.lead} />
              <td className="num">{formatoCifra(r.aperti)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>Totale</td>
            <td className="num">{formatoCifra(totale.lead)}</td>
            <Cifra n={totale.mai_lavorati} base={totale.lead} />
            <td className="num">{mediaAzioni(totale)}</td>
            <td className="num">{durata(totale.primo_contatto_ore)}</td>
            <Cifra n={totale.entro_24h} base={totale.lead} />
            <Cifra n={totale.senza_risposta} base={totale.lead} />
            <Cifra n={totale.persi} base={totale.lead} />
            <td className="num">{formatoCifra(totale.aperti)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
