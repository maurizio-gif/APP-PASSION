import { crm, richiediSezione, type Prova } from '@/lib/crm'
import { formatoData, formatoFa } from '@/lib/formato'
import { Avviso, BollinoFonte, Contatti, Gestione, LinkGuida, Persona, Schede, Vuoto } from '@/components/Ui'
import { FiltroConsulente, consulenteScelto } from '@/components/FiltroConsulente'
import { SceltaOperatore } from '@/components/SceltaOperatore'
import { aggiornaProva } from '../azioni'

const VISTE = [
  { chiave: 'in_corso', testo: 'In corso' },
  { chiave: 'in_scadenza', testo: 'In scadenza' },
  { chiave: 'senza_esito', testo: 'Finite senza esito' },
  { chiave: 'chiuse', testo: 'Chiuse' },
]

// L'ordine si sceglie qui, sulle righe gia' arrivate da crm_prove (che ne da'
// al massimo 300: nelle Chiuse sono le piu' recenti). «Scadenza» e' l'ordine
// di crm_prove: prima quelle che finiscono, nelle Chiuse le ultime finite.
const testo = (s: string | null) => (s ?? '').toLocaleLowerCase('it')
const data = (s: string | null) => (s ? new Date(s).getTime() : null)
// Le date mancanti vanno sempre in fondo, in entrambi i versi.
const perData = (a: string | null, b: string | null, verso: 1 | -1) => {
  const x = data(a), y = data(b)
  return x == null ? (y == null ? 0 : 1) : y == null ? -1 : (x - y) * verso
}
const ORDINI: { chiave: string; testo: string; confronto?: (a: Prova, b: Prova) => number }[] = [
  { chiave: 'scadenza', testo: 'Scadenza' },
  { chiave: 'scadenza_lontana', testo: 'Scadenza più lontana', confronto: (a, b) => perData(a.data_fine, b.data_fine, -1) },
  { chiave: 'inizio_recente', testo: 'Iniziate da poco', confronto: (a, b) => perData(a.data_inizio, b.data_inizio, -1) },
  { chiave: 'inizio_vecchio', testo: 'Iniziate da più tempo', confronto: (a, b) => perData(a.data_inizio, b.data_inizio, 1) },
  { chiave: 'nome', testo: 'Nome (A-Z)', confronto: (a, b) => testo(a.cognome || a.nome).localeCompare(testo(b.cognome || b.nome), 'it') || testo(a.nome).localeCompare(testo(b.nome), 'it') },
  { chiave: 'ingressi_pochi', testo: 'Meno ingressi', confronto: (a, b) => a.ingressi - b.ingressi },
  { chiave: 'ingressi_tanti', testo: 'Più ingressi', confronto: (a, b) => b.ingressi - a.ingressi },
  { chiave: 'ultimo_ingresso', testo: 'Assenti da più tempo', confronto: (a, b) => perData(a.ultimo_ingresso, b.ultimo_ingresso, 1) },
  { chiave: 'lezioni', testo: 'Più lezioni prenotate', confronto: (a, b) => b.prenotazioni - a.prenotazioni },
  { chiave: 'consulente', testo: 'Consulente', confronto: (a, b) => (a.gestito_nome ? 0 : 1) - (b.gestito_nome ? 0 : 1) || testo(a.gestito_nome).localeCompare(testo(b.gestito_nome), 'it') },
]

// «Il container prove»: chi sta provando la palestra, come si sta comportando
// (ingressi, lezioni) e com'e' finita. L'esito lo mette il mirror (20260929u):
// iscritto quando su PerfectGym compare l'abbonamento, non iscritto 30 giorni
// dopo la fine del pass. A mano si chiude prima come non iscritto.
export default async function Prove({ searchParams }: { searchParams: { vista?: string; consulente?: string; ordine?: string; errore?: string } }) {
  await richiediSezione('prove')
  const vista = VISTE.some((v) => v.chiave === searchParams.vista) ? searchParams.vista! : 'in_corso'
  const ordine = ORDINI.find((o) => o.chiave === searchParams.ordine) ?? ORDINI[0]
  const staff = await crm.staff()
  // Il consulente: chi segue la prova.
  const consulente = consulenteScelto(staff, searchParams.consulente)
  const prove = await crm.prove(vista, consulente)
  // sort e' stabile: a parita' resta l'ordine di crm_prove.
  if (ordine.confronto) prove.sort(ordine.confronto)
  // Consulente e ordine restano cambiando scheda e dopo il Salva.
  const resta = [consulente && `consulente=${consulente}`, ordine.confronto && `ordine=${ordine.chiave}`].filter(Boolean).join('&')
  const qui = `/dashboard/prove?vista=${vista}${resta ? `&${resta}` : ''}`

  return (
    <>
      <div className="testata">
        <div>
          <h1>Prove</h1>
          <p>
            Il Pass arriva da PerfectGym da solo, e anche l&apos;esito: Iscritto quando compare l&apos;abbonamento, Non iscritto 30 giorni
            dopo la fine del pass. Qui si segue la persona fino all&apos;iscrizione.{' '}
            <LinkGuida argomento="prove" />
          </p>
        </div>
      </div>
      <Avviso errore={searchParams.errore} />
      <Schede voci={VISTE} attiva={vista} base={`/dashboard/prove${resta ? `?${resta}` : ''}`} />
      <FiltroConsulente azione="/dashboard/prove" staff={staff} consulente={consulente} tieni={{ vista }}>
        <select name="ordine" defaultValue={ordine.chiave} aria-label="Ordina per">
          {ORDINI.map((o) => <option key={o.chiave} value={o.chiave}>Ordina: {o.testo}</option>)}
        </select>
      </FiltroConsulente>

      <div className="scheda">
        {prove.length === 0 ? (
          <Vuoto>Nessuna prova qui.</Vuoto>
        ) : (
          <div className="tabella-scorre">
            <table className="schede-mobile">
              <thead>
                <tr>
                  <th>Persona</th>
                  <th>Pass</th>
                  <th>Come va</th>
                  <th>Esito</th>
                </tr>
              </thead>
              <tbody>
                {prove.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Persona id={p.utente_id} nome={p.nome} cognome={p.cognome} />
                      <Contatti telefono={p.telefono} email={p.email} />
                      <BollinoFonte fonte={p.fonte} dettaglio={p.fonte_dettaglio} />
                    </td>
                    <td className="piccolo info">
                      <div>{p.tipo_pass ?? '—'}</div>
                      <div className="attenuato nowrap">{formatoData(p.data_inizio)} → {formatoData(p.data_fine)}</div>
                      {p.giorni_rimasti != null && p.giorni_rimasti >= 0 && !p.esito && (
                        <span className={`bollino ${p.giorni_rimasti <= 3 ? 'rosso' : 'giallo'}`}>
                          {p.giorni_rimasti === 0 ? 'finisce oggi' : `${p.giorni_rimasti} gg`}
                        </span>
                      )}
                    </td>
                    <td className="piccolo info">
                      <div><strong>{p.ingressi}</strong> ingressi{p.ultimo_ingresso ? ` · ultimo ${formatoFa(p.ultimo_ingresso)}` : ''}</div>
                      <div><strong>{p.prenotazioni}</strong> lezioni prenotate · {p.presenze} fatte</div>
                      {p.ingressi === 0 && <span className="bollino rosso">mai entrato</span>}
                      {p.iscritto_su_pgm && !p.esito && <div className="bollino verde">ha già un contratto su PerfectGym</div>}
                      <div className="attenuato">{p.gestito_nome ? `segue ${p.gestito_nome}` : 'nessuno la segue'}</div>
                    </td>
                    <td className="gestisci">
                      <Gestione id={p.id}>
                        <form action={aggiornaProva} className="modulo compatto">
                          <input type="hidden" name="prova" value={p.id} />
                          <input type="hidden" name="torna" value={qui} />
                          {/* Iscritto non si sceglie: resta solo se c'e' gia'. */}
                          <select name="esito" defaultValue={p.esito ?? ''} aria-label="Esito">
                            <option value="">Ancora aperta</option>
                            {p.esito === 'iscritto' && <option value="iscritto">Iscritto</option>}
                            <option value="non_iscritto">Non iscritto</option>
                          </select>
                          <input type="text" name="obiezione" defaultValue={p.obiezione ?? ''} placeholder="Obiezione" />
                          <input type="text" name="note" defaultValue={p.note ?? ''} placeholder="Note" />
                          <SceltaOperatore staff={staff} attuale={p.gestito_da} attualeNome={p.gestito_nome} />
                          <button className="bottone piccolo">Salva</button>
                        </form>
                      </Gestione>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
