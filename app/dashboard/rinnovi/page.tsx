import { crm, linkPgm, richiediSezione } from '@/lib/crm'
import { ESITO_RINNOVO, formatoData, formatoEuro, STATO_CONTRATTO, traduci } from '@/lib/formato'
import { Avviso, Contatti, Persona, Schede, Vuoto } from '@/components/Ui'
import { aggiornaRinnovo } from '../azioni'

const VISTE = [
  { chiave: 'da_gestire', testo: 'Da gestire' },
  { chiave: 'rinnovati', testo: 'Rinnovati' },
  { chiave: 'non_rinnovati', testo: 'Non rinnovati' },
  { chiave: 'tutti', testo: 'Tutti' },
]

// I rinnovi: gli abbonamenti in scadenza, uno per contratto. Per ora nascono
// su Airtable (l'automazione di fine mese) e arrivano qui col sync; l'esito
// si scrive qui o su Airtable, e vale l'ultimo cambiato.
export default async function Rinnovi({ searchParams }: { searchParams: { vista?: string; errore?: string } }) {
  const io = await richiediSezione('rinnovi')
  const vista = VISTE.some((v) => v.chiave === searchParams.vista) ? searchParams.vista! : 'da_gestire'
  const [rinnovi, staff] = await Promise.all([crm.rinnovi(vista), crm.staff()])
  const qui = `/dashboard/rinnovi?vista=${vista}`

  return (
    <>
      <div className="testata">
        <div>
          <h1>Rinnovi</h1>
          <p>Gli abbonamenti in scadenza: chi li segue, e com&apos;è finita. Il rinnovo su PerfectGym si vede da solo.</p>
        </div>
      </div>
      <Avviso errore={searchParams.errore} />
      <Schede voci={VISTE} attiva={vista} base="/dashboard/rinnovi" />

      <div className="scheda">
        {rinnovi.length === 0 ? (
          <Vuoto>Nessun rinnovo qui.</Vuoto>
        ) : (
          <div className="tabella-scorre">
            <table>
              <thead>
                <tr>
                  <th>Socio</th>
                  <th>Abbonamento</th>
                  <th>Gestione</th>
                </tr>
              </thead>
              <tbody>
                {rinnovi.map((r) => {
                  const pgm = linkPgm(r.member_id)
                  return (
                    <tr key={r.id}>
                      <td>
                        <Persona id={r.utente_id} nome={r.nome} cognome={r.cognome} />
                        <Contatti telefono={r.telefono} email={r.email} />
                        {r.esito && (
                          <span className={`bollino ${r.esito === 'rinnovato' ? 'verde' : 'grigio'}`}>{traduci(ESITO_RINNOVO, r.esito)}</span>
                        )}
                        {r.gestito_il && <div className="piccolo attenuato">{r.assegnato_nome ?? '—'} · {formatoData(r.gestito_il)}</div>}
                        {pgm && <a className="piccolo" href={pgm} target="_blank" rel="noreferrer">PerfectGym ↗</a>}
                      </td>
                      <td className="piccolo">
                        <div><strong>{r.piano ?? '—'}</strong> · {formatoEuro(r.valore)}</div>
                        <div>scade il <strong>{formatoData(r.scadenza)}</strong></div>
                        {r.stato_contratto && <div className="attenuato">{traduci(STATO_CONTRATTO, r.stato_contratto)}</div>}
                        {r.rinnovato_su_pgm && <span className="bollino verde">Nuovo abbonamento su PerfectGym</span>}
                        {r.task_aperti > 0 && <div className="attenuato">{r.task_aperti} {r.task_aperti === 1 ? 'task aperto' : 'task aperti'}</div>}
                      </td>
                      <td>
                        <form action={aggiornaRinnovo} className="modulo compatto">
                          <input type="hidden" name="rinnovo" value={r.id} />
                          <input type="hidden" name="torna" value={qui} />
                          <div className="azioni-riga">
                            <select name="esito" defaultValue={r.esito ?? ''} aria-label="Esito">
                              <option value="">Esito…</option>
                              {Object.entries(ESITO_RINNOVO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                            <select name="assegnato" defaultValue={r.assegnato_a ?? io?.id ?? ''} aria-label="Chi lo segue">
                              {staff.map((s) => <option key={s.id} value={s.id}>{s.nome} {s.cognome ?? ''}</option>)}
                            </select>
                          </div>
                          <input type="text" name="note" defaultValue={r.note ?? ''} placeholder="Note" />
                          <button className="bottone piccolo">Salva</button>
                        </form>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
