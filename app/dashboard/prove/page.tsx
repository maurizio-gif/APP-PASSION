import { crm } from '@/lib/crm'
import { formatoData, formatoFa } from '@/lib/formato'
import { Avviso, BollinoFonte, Contatti, Persona, Schede, Vuoto } from '@/components/Ui'
import { aggiornaProva } from '../azioni'

const VISTE = [
  { chiave: 'in_corso', testo: 'In corso' },
  { chiave: 'in_scadenza', testo: 'In scadenza' },
  { chiave: 'senza_esito', testo: 'Finite senza esito' },
  { chiave: 'chiuse', testo: 'Chiuse' },
]

// «Il container prove»: chi sta provando la palestra, come si sta comportando
// (ingressi, lezioni) e com'e' finita. L'esito lo si scrive qui.
export default async function Prove({ searchParams }: { searchParams: { vista?: string; errore?: string } }) {
  const vista = VISTE.some((v) => v.chiave === searchParams.vista) ? searchParams.vista! : 'in_corso'
  const prove = await crm.prove(vista)
  const qui = `/dashboard/prove?vista=${vista}`

  return (
    <>
      <div className="testata">
        <div>
          <h1>Prove</h1>
          <p>Il Pass arriva da PerfectGym da solo. Qui si segue la persona fino all&apos;iscrizione.</p>
        </div>
      </div>
      <Avviso errore={searchParams.errore} />
      <Schede voci={VISTE} attiva={vista} base="/dashboard/prove" />

      <div className="scheda">
        {prove.length === 0 ? (
          <Vuoto>Nessuna prova qui.</Vuoto>
        ) : (
          <div className="tabella-scorre">
            <table>
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
                    <td className="piccolo">
                      <div>{p.tipo_pass ?? '—'}</div>
                      <div className="attenuato nowrap">{formatoData(p.data_inizio)} → {formatoData(p.data_fine)}</div>
                      {p.giorni_rimasti != null && p.giorni_rimasti >= 0 && !p.esito && (
                        <span className={`bollino ${p.giorni_rimasti <= 2 ? 'rosso' : 'giallo'}`}>
                          {p.giorni_rimasti === 0 ? 'finisce oggi' : `${p.giorni_rimasti} gg`}
                        </span>
                      )}
                    </td>
                    <td className="piccolo">
                      <div><strong>{p.ingressi}</strong> ingressi{p.ultimo_ingresso ? ` · ultimo ${formatoFa(p.ultimo_ingresso)}` : ''}</div>
                      <div><strong>{p.prenotazioni}</strong> lezioni prenotate · {p.presenze} fatte</div>
                      {p.ingressi === 0 && <span className="bollino rosso">mai entrato</span>}
                      {p.iscritto_su_pgm && !p.esito && <div className="bollino verde">ha già un contratto su PerfectGym</div>}
                      <div className="attenuato">{p.gestito_nome ? `segue ${p.gestito_nome}` : 'nessuno la segue'}</div>
                    </td>
                    <td>
                      <form action={aggiornaProva} className="modulo compatto">
                        <input type="hidden" name="prova" value={p.id} />
                        <input type="hidden" name="torna" value={qui} />
                        <select name="esito" defaultValue={p.esito ?? (p.iscritto_su_pgm ? 'iscritto' : '')} aria-label="Esito">
                          <option value="">Ancora aperto</option>
                          <option value="iscritto">Iscritto</option>
                          <option value="non_iscritto">Non iscritto</option>
                        </select>
                        <input type="text" name="obiezione" defaultValue={p.obiezione ?? ''} placeholder="Obiezione" />
                        <input type="text" name="note" defaultValue={p.note ?? ''} placeholder="Note" />
                        <div className="azioni-riga">
                          {!p.gestito_nome && <label className="spunta"><input type="checkbox" name="gestisco" /> la seguo io</label>}
                          <button className="bottone piccolo">Salva</button>
                        </div>
                      </form>
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
