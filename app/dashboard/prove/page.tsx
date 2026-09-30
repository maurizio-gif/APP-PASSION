import { crm, richiediSezione } from '@/lib/crm'
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

// «Il container prove»: chi sta provando la palestra, come si sta comportando
// (ingressi, lezioni) e com'e' finita. L'esito lo mette il mirror (20260929u):
// iscritto quando su PerfectGym compare l'abbonamento, non iscritto 30 giorni
// dopo la fine del pass. A mano si chiude prima come non iscritto.
export default async function Prove({ searchParams }: { searchParams: { vista?: string; consulente?: string; errore?: string } }) {
  await richiediSezione('prove')
  const vista = VISTE.some((v) => v.chiave === searchParams.vista) ? searchParams.vista! : 'in_corso'
  const staff = await crm.staff()
  // Il consulente: chi segue la prova.
  const consulente = consulenteScelto(staff, searchParams.consulente)
  const prove = await crm.prove(vista, consulente)
  const perConsulente = consulente ? `consulente=${consulente}` : ''
  const qui = `/dashboard/prove?vista=${vista}${perConsulente ? `&${perConsulente}` : ''}`

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
      <Schede voci={VISTE} attiva={vista} base={`/dashboard/prove${perConsulente ? `?${perConsulente}` : ''}`} />
      <FiltroConsulente azione="/dashboard/prove" staff={staff} consulente={consulente} tieni={{ vista }} />

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
                        <span className={`bollino ${p.giorni_rimasti <= 2 ? 'rosso' : 'giallo'}`}>
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
