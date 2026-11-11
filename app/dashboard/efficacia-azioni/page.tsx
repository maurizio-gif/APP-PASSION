import { crm, richiediSezione } from '@/lib/crm'
import type { RigaEfficacia } from '@/lib/crm'
import { SchedeMulti, Vuoto } from '@/components/Ui'
import { Riquadro } from '@/components/FaseRighe'
import { ESITI_AZIONE } from '@/components/TabellaAzioniIstruttori'

const FINESTRE = [
  { chiave: '14', testo: '14 giorni', giorni: 14 },
  { chiave: '30', testo: '30 giorni', giorni: 30 },
  { chiave: '60', testo: '60 giorni', giorni: 60 },
  { chiave: '0', testo: 'Fino a oggi', giorni: 0 },
]
const LISTE = [
  { chiave: 'tutte', testo: 'Tutte' },
  { chiave: 'benvenuto', testo: 'Nuovi iscritti' },
  { chiave: 'recupero_formula8', testo: 'Recupero Formula 8' },
]
const NOME_LISTA: Record<string, string> = { benvenuto: 'Nuovi iscritti', recupero_formula8: 'Recupero Formula 8' }

const percento = (n: number, tot: number) => (tot > 0 ? `${(Math.round((n * 1000) / tot) / 10).toLocaleString('it-IT')}%` : '—')
const Cella = ({ n, tot }: { n: number; tot: number }) => (
  <td>
    <div className="riga-dati">
      <strong>{n}</strong>
      <span className="muto">{percento(n, tot)}</span>
    </div>
  </td>
)
const Testata = ({ primo }: { primo: string }) => (
  <thead>
    <tr>
      <th>{primo}</th>
      <th>Persone</th>
      <th>Prenotano Formula 8</th>
      <th>Add on Formula 8</th>
      <th>Abbonamento Formula 8</th>
      <th>Attivano Formula 8</th>
    </tr>
  </thead>
)
const Riga = ({ etichetta, sotto, r }: { etichetta: string; sotto?: string; r: RigaEfficacia }) => (
  <tr>
    <td>
      <div className="riga-dati">
        <strong>{etichetta}</strong>
        {sotto && <span className="muto">{sotto}</span>}
      </div>
    </td>
    <td><div className="riga-dati"><strong>{r.azioni}</strong></div></td>
    <Cella n={r.prenotata} tot={r.azioni} />
    <Cella n={r.addon} tot={r.azioni} />
    <Cella n={r.abbonamento} tot={r.azioni} />
    <Cella n={r.attivato} tot={r.azioni} />
  </tr>
)

// L'efficacia delle azioni degli istruttori (20261111a): dopo un'azione, quante persone prenotano una lezione
// Formula 8, attivano l'add on Formula 8 o l'abbonamento Formula 8. Si confrontano le azioni lavorate con quelle
// non ancora lavorate (che dicono quante ne arrivano comunque, senza una chiamata).
export default async function EfficaciaAzioni({ searchParams }: { searchParams: { finestra?: string; lista?: string } }) {
  await richiediSezione('efficacia_azioni')
  const finestra = FINESTRE.find((f) => f.chiave === searchParams.finestra) ?? FINESTRE[1]
  const lista = LISTE.some((l) => l.chiave === searchParams.lista) ? searchParams.lista! : 'tutte'
  const d = await crm.efficaciaAzioni(finestra.giorni)
  const generale = d.generale.filter((r) => lista === 'tutte' || r.tipo === lista)
  const esiti = d.per_esito.filter((r) => lista === 'tutte' || r.tipo === lista)
  const lavorate = generale.filter((r) => r.lavorata).reduce((s, r) => s + r.azioni, 0)
  const tipi = Array.from(new Set(generale.map((r) => r.tipo)))
  const href = (f: string, l: string) => `/dashboard/efficacia-azioni?finestra=${f}&lista=${l}`

  return (
    <>
      <div className="testata">
        <div>
          <div className="titolo-riga">
            <h1>Efficacia azioni</h1>
            <span className="aiuto-titolo" tabIndex={0} role="note" aria-label="Cos'è questa sezione">
              <span className="aiuto-punto" aria-hidden="true">?</span>
              <span className="aiuto-testo">
                Dopo un’azione degli istruttori, quante persone prenotano una lezione Formula 8, attivano l’add on o l’abbonamento Formula 8.
                Le azioni lavorate si confrontano con quelle non ancora lavorate.
              </span>
            </span>
          </div>
        </div>
      </div>
      <SchedeMulti gruppi={[
        { testo: 'Finestra dopo l’azione', tono: 'prova', voci: FINESTRE.map((f) => ({ testo: f.testo, href: href(f.chiave, lista), attivo: f.chiave === finestra.chiave })) },
        { testo: 'Contenitore', tono: 'lavoro', voci: LISTE.map((l) => ({ testo: l.testo, href: href(finestra.chiave, l.chiave), attivo: l.chiave === lista })) },
      ]} />

      {lavorate === 0 && (
        <p className="piccolo attenuato">
          Ancora nessuna azione lavorata: i risultati si riempiono man mano che gli istruttori chiudono le azioni. Per ora le righe «Non ancora lavorate» dicono quante persone attivano Formula 8 comunque.
        </p>
      )}

      {tipi.length === 0 ? (
        <div className="scheda"><Vuoto>Nessuna azione.</Vuoto></div>
      ) : (
        tipi.map((tipo) => {
          const righe = generale.filter((r) => r.tipo === tipo)
          const si = righe.find((r) => r.lavorata)
          const no = righe.find((r) => !r.lavorata)
          const vuota: RigaEfficacia = { azioni: 0, prenotata: 0, addon: 0, abbonamento: 0, attivato: 0 }
          return (
            <Riquadro titolo={NOME_LISTA[tipo] ?? tipo} key={tipo}>
              <div className="tabella-scorre">
                <table className="schede-mobile tabella-colonne tabella-uniforme">
                  <Testata primo="Azioni" />
                  <tbody>
                    <Riga etichetta="Lavorate" sotto="chiuse da un istruttore, contate dal giorno della chiusura" r={si ?? vuota} />
                    <Riga etichetta="Non ancora lavorate" sotto="contate dal giorno in cui sono nate" r={no ?? vuota} />
                  </tbody>
                </table>
              </div>
            </Riquadro>
          )
        })
      )}

      {esiti.length > 0 && (
        <Riquadro titolo="Per come è andata">
          <div className="tabella-scorre">
            <table className="schede-mobile tabella-colonne tabella-uniforme">
              <Testata primo="Esito" />
              <tbody>
                {esiti.map((r) => (
                  <Riga key={`${r.tipo}-${r.esito}`} etichetta={ESITI_AZIONE.find((e) => e.chiave === r.esito)?.testo ?? '—'} sotto={lista === 'tutte' ? NOME_LISTA[r.tipo] : undefined} r={r} />
                ))}
              </tbody>
            </table>
          </div>
        </Riquadro>
      )}

      {d.per_istruttore.length > 0 && (
        <Riquadro titolo="Per istruttore">
          <p className="piccolo attenuato sotto-titolo">Le azioni che ha chiuso, di tutti i contenitori.</p>
          <div className="tabella-scorre">
            <table className="schede-mobile tabella-colonne tabella-uniforme">
              <Testata primo="Istruttore" />
              <tbody>
                {d.per_istruttore.map((r) => (
                  <Riga key={r.staff_id ?? 'x'} etichetta={r.nome ?? '—'} r={r} />
                ))}
              </tbody>
            </table>
          </div>
        </Riquadro>
      )}

      <p className="piccolo attenuato">
        Come si conta: «prenotano» è una lezione della categoria Formula 8 (non annullata, non in lista d’attesa) che cade nella finestra; «add on» e «abbonamento» sono contratti Formula 8 che partono nella finestra;
        «attivano» è l’uno o l’altro. Le azioni più recenti hanno avuto meno tempo, quindi i numeri crescono nei giorni. Chi viene chiamato prima non è scelto a caso: il confronto con le azioni non lavorate è un’indicazione, non una prova.
      </p>
    </>
  )
}
