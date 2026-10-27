import type { Io, Iscrizione, Operatore } from '@/lib/crm'
import { formatoData, formatoEuro } from '@/lib/formato'
import { puoGestire } from '@/lib/permessi'
import { Avviso, Contatti, Gestione, Persona, Schede, Vuoto } from './Ui'
import { assegnaIscrizione, iscrizioneOnline, rilasciaIscrizione } from '@/app/dashboard/azioni'

export const VISTE = [
  { chiave: 'da_assegnare', testo: 'Da prendere in carico' },
  { chiave: 'assegnate', testo: 'Assegnate' },
  { chiave: 'online', testo: 'Online' },
  { chiave: 'tutte', testo: 'Tutte' },
]

// I contratti senza consulente, disegnati: li usano la pagina vera
// (app/dashboard/contratti-senza-consulente) e l'anteprima locale. `base` e'
// dove puntano le schede e i moduli.
export function VistaContratti({ righe, io, staff, vista, base, errore }: { righe: Iscrizione[]; io: Io; staff: Operatore[]; vista: string; base: string; errore?: string }) {
  const qui = `${base}?vista=${vista}`
  return (
    <>
      <div className="testata">
        <div>
          <div className="titolo-riga">
            <h1>Contratti senza consulente</h1>
            <span className="aiuto-titolo" tabIndex={0} role="note" aria-label="Cos'è questa sezione">
              <span className="aiuto-punto" aria-hidden="true">?</span>
              <span className="aiuto-testo">
                Abbonamenti nuovi che nessuna opportunità ha portato: la persona si è iscritta senza chiedere informazioni. Chi li ha seguiti li prende in
                carico e scrive una nota su come è nato il contratto; contano nella sua performance. Se la persona ha già lavorato con un consulente (task fatti,
                prova) lo trovi come suggerimento, già scelto nella tendina. Se l&apos;iscrizione è stata fatta dalla persona da sola, online, si segna «Online» e
                non va a nessuno. Qui non entrano rinnovi né cambi abbonamento. Da qui in poi, dal 28 settembre 2026.
              </span>
            </span>
          </div>
        </div>
      </div>
      <Avviso errore={errore} />
      <Schede voci={VISTE} attiva={vista} base={base} />

      <div className="scheda">
        {righe.length === 0 ? (
          <Vuoto>{vista === 'da_assegnare' ? 'Tutti i contratti hanno un consulente.' : 'Nessun contratto qui.'}</Vuoto>
        ) : (
          <div className="tabella-scorre">
            <table className="schede-mobile tabella-colonne tabella-uniforme tabella-contratti">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Firma</th>
                  <th>Abbonamento</th>
                  <th>Consulente</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {righe.map((r) => {
                  const mio = puoGestire(io, r.consulente_id)
                  return (
                    <tr key={r.contract_id}>
                      <td>
                        <div className="riga-dati">
                          <Persona id={r.utente_id} nome={r.nome} cognome={r.cognome} nuovaScheda />
                          <Contatti telefono={r.telefono} email={r.email} />
                        </div>
                      </td>
                      <td>
                        <div className="riga-dati">
                          <span className="normale"><span className="prefisso-mobile">Firmato il </span>{formatoData(r.data_firma)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="riga-dati">
                          <strong>{(r.piano ?? '—').replace(/^[#^* ]+/, '')}</strong>
                          <span className="muto">
                            {formatoEuro(r.canone)} al mese · vincolo {r.mesi} {r.mesi === 1 ? 'mese' : 'mesi'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="riga-dati">
                          {r.stato === 'online' ? (
                            <span className="bollino grigio">Online · nessun consulente</span>
                          ) : r.consulente ? (
                            <>
                              <strong>{r.consulente}</strong>
                              <span className="muto">{r.da_opportunita && !r.assegnato_il ? 'dall’opportunità' : `preso in carico il ${formatoData(r.assegnato_il)}`}</span>
                            </>
                          ) : (
                            <span className="bollino rosso">Da prendere in carico</span>
                          )}
                          {r.stato === 'da_assegnare' && r.suggerito && (
                            <span className="muto" title="Un suggerimento, non un'assegnazione: chi prende in carico conferma o sceglie un altro">
                              Suggerito: <strong>{r.suggerito}</strong>
                              {r.motivo_suggerimento && <> · {r.motivo_suggerimento}</>}
                            </span>
                          )}
                          {r.note && <span className="normale" style={{ whiteSpace: 'pre-wrap' }}>{r.note}</span>}
                        </div>
                      </td>
                      <td>
                        {r.stato === 'da_assegnare' ? (
                          <Gestione id={String(r.contract_id)} testo="Prendo in carico">
                            <form action={assegnaIscrizione} className="modulo-riga">
                              <input type="hidden" name="contratto" value={r.contract_id} />
                              <input type="hidden" name="torna" value={qui} />
                              <textarea name="note" required rows={2} placeholder="Nota (obbligatoria): come è nato il contratto, cosa vi siete detti" aria-label="Nota" />
                              <select name="staff" defaultValue={r.suggerito_id ?? ''} aria-label="Chi lo prende in carico">
                                <option value="">Io</option>
                                {staff.map((o) => (
                                  <option key={o.id} value={o.id}>
                                    {o.nome} {o.cognome ?? ''}
                                  </option>
                                ))}
                              </select>
                              <button className="bottone piccolo">Prendo in carico</button>
                            </form>
                            <form action={iscrizioneOnline} className="modulo-riga">
                              <input type="hidden" name="contratto" value={r.contract_id} />
                              <input type="hidden" name="torna" value={qui} />
                              <button className="bottone secondario piccolo" title="Iscrizione fatta dalla persona da sola: non va a nessun consulente">
                                Online, nessun consulente
                              </button>
                            </form>
                          </Gestione>
                        ) : mio ? (
                          <Gestione id={String(r.contract_id)} testo="Cambia">
                            <form action={assegnaIscrizione} className="modulo-riga">
                              <input type="hidden" name="contratto" value={r.contract_id} />
                              <input type="hidden" name="torna" value={qui} />
                              <textarea name="note" required rows={2} placeholder="Nota (obbligatoria)" defaultValue={r.note ?? ''} aria-label="Nota" />
                              <select name="staff" defaultValue={r.consulente_id ?? ''} aria-label="Chi lo ha in carico">
                                <option value="">Io</option>
                                {staff.map((o) => (
                                  <option key={o.id} value={o.id}>
                                    {o.nome} {o.cognome ?? ''}
                                  </option>
                                ))}
                              </select>
                              <button className="bottone piccolo">Assegna</button>
                            </form>
                            {r.assegnato_il && (
                              <form action={rilasciaIscrizione} className="modulo-riga">
                                <input type="hidden" name="contratto" value={r.contract_id} />
                                <input type="hidden" name="torna" value={qui} />
                                <button className="bottone secondario piccolo">Rimetti da assegnare</button>
                              </form>
                            )}
                          </Gestione>
                        ) : null}
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
