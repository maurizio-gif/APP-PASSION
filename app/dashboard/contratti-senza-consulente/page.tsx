import Link from 'next/link'
import { crm, richiediSezione } from '@/lib/crm'
import { formatoData, formatoEuro } from '@/lib/formato'
import { puoGestire } from '@/lib/permessi'
import { Avviso, Contatti, Gestione, Persona, Schede, Vuoto } from '@/components/Ui'
import { assegnaIscrizione, iscrizioneOnline, rilasciaIscrizione } from '../azioni'

const VISTE = [
  { chiave: 'da_assegnare', testo: 'Da prendere in carico' },
  { chiave: 'assegnate', testo: 'Assegnate' },
  { chiave: 'online', testo: 'Online' },
  { chiave: 'tutte', testo: 'Tutte' },
]

// I contratti senza consulente: gli abbonamenti nuovi che nessuna opportunità
// ha portato («in prima battuta»: la persona si iscrive e basta). Il consulente
// di PerfectGym non si usa: si prendono in carico da qui, come le disdette, e
// serve una nota. Le regole (cosa è «nuovo», chi può riassegnare) stanno nel
// database, in supabase/migrations/20261027g_contratti_senza_consulente.sql.
export default async function ContrattiSenzaConsulente({ searchParams }: { searchParams: { vista?: string; errore?: string } }) {
  await richiediSezione('lead')
  const vista = VISTE.some((v) => v.chiave === searchParams.vista) ? searchParams.vista! : 'da_assegnare'
  const [righe, io, staff] = await Promise.all([crm.iscrizioni(vista), crm.io(), crm.staff()])
  const qui = `/dashboard/contratti-senza-consulente?vista=${vista}`

  return (
    <>
      <div className="testata">
        <div>
          <h1>Contratti senza consulente</h1>
          <p>
            Abbonamenti nuovi che nessuna opportunità ha portato: la persona si è iscritta senza chiedere informazioni. Chi li ha seguiti li prende in
            carico e scrive una nota su come è nato il contratto; contano nella sua performance. Se l&apos;iscrizione è stata fatta dalla persona da sola, online,
            si segna «Online» e non va a nessuno. Qui non entrano rinnovi né cambi abbonamento.
          </p>
        </div>
      </div>
      <Avviso errore={searchParams.errore} />
      <Schede voci={VISTE} attiva={vista} base="/dashboard/contratti-senza-consulente" />

      <div className="scheda">
        {righe.length === 0 ? (
          <Vuoto>{vista === 'da_assegnare' ? 'Tutti i contratti hanno un consulente.' : 'Nessun contratto qui.'}</Vuoto>
        ) : (
          <div className="tabella-scorre">
            <table className="schede-mobile">
              <thead>
                <tr>
                  <th>Firma</th>
                  <th>Persona</th>
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
                      <td className="nowrap">{formatoData(r.data_firma)}</td>
                      <td>
                        <Persona id={r.utente_id} nome={r.nome} cognome={r.cognome} nuovaScheda />
                        <Contatti telefono={r.telefono} email={r.email} />
                      </td>
                      <td className="piccolo info">
                        <div><strong>{(r.piano ?? '—').replace(/^[#^* ]+/, '')}</strong></div>
                        <div className="attenuato">{formatoEuro(r.canone)} al mese · vincolo {r.mesi} {r.mesi === 1 ? 'mese' : 'mesi'}</div>
                      </td>
                      <td className="piccolo info">
                        {r.stato === 'online' ? (
                          <span className="bollino grigio">Online · nessun consulente</span>
                        ) : r.consulente ? (
                          <div>
                            <strong>{r.consulente}</strong>
                            <div className="attenuato">{r.da_opportunita && !r.assegnato_il ? 'dall’opportunità' : `preso in carico il ${formatoData(r.assegnato_il)}`}</div>
                          </div>
                        ) : (
                          <span className="bollino rosso">Da prendere in carico</span>
                        )}
                        {r.note && <div style={{ whiteSpace: 'pre-wrap' }}>{r.note}</div>}
                      </td>
                      <td>
                        {r.stato === 'da_assegnare' ? (
                          <Gestione id={String(r.contract_id)} testo="Prendo in carico">
                            <form action={assegnaIscrizione} className="modulo-riga">
                              <input type="hidden" name="contratto" value={r.contract_id} />
                              <input type="hidden" name="torna" value={qui} />
                              <textarea name="note" required rows={2} placeholder="Nota (obbligatoria): come è nato il contratto, cosa vi siete detti" aria-label="Nota" />
                              <select name="staff" defaultValue="" aria-label="Chi lo prende in carico">
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
      <p className="piccolo attenuato">
        Da qui in poi, dal 28 settembre 2026. <Link href="/dashboard">← Dashboard consulente</Link>
      </p>
    </>
  )
}
