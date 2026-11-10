import type { AzioneIstruttore, EsitoAzioneIstruttore, Io } from '@/lib/crm'
import { formatoData, formatoDataOra, oggiRoma } from '@/lib/formato'
import { ha } from '@/lib/permessi'
import { Contatti, Persona } from '@/components/Ui'
import { completaAzioneIstruttore, lasciaAzioneIstruttore, prendiAzioneIstruttore } from '@/app/dashboard/azioni'

// Come e' andata: il testo che vede l'istruttore. L'ordine e' quello dei bottoni.
export const ESITI_AZIONE: { chiave: EsitoAzioneIstruttore; testo: string; breve: string; tono: 'verde' | 'giallo' | 'grigio' }[] = [
  { chiave: 'prenotata', testo: 'Ha prenotato una lezione', breve: 'Prenotata', tono: 'verde' },
  { chiave: 'da_richiamare', testo: 'Interessata, da richiamare', breve: 'Da richiamare', tono: 'giallo' },
  { chiave: 'non_risponde', testo: 'Non risponde', breve: 'Non risponde', tono: 'grigio' },
  { chiave: 'non_interessata', testo: 'Non interessata', breve: 'Non interessata', tono: 'grigio' },
]

const giorniFa = (giorno: string) => {
  const n = Math.round((new Date(`${oggiRoma()}T12:00:00Z`).getTime() - new Date(`${giorno}T12:00:00Z`).getTime()) / 86400000)
  return n <= 0 ? 'oggi' : n === 1 ? '1 giorno fa' : `${n} giorni fa`
}

// L'abbonamento vero attivo della persona, e da quando.
function situazione(a: AzioneIstruttore) {
  if (!a.piano_nome) return 'Abbonamento attivo'
  return `${a.piano_nome.replace(/^\^\s*/, '')}${a.piano_inizio ? ` · dal ${formatoData(a.piano_inizio)}` : ''}`
}

// Le azioni degli istruttori: una riga per persona (sul telefono diventa una scheda). Libera: si prende in
// carico. Mia: si chiude con l'esito (e una nota). Di un altro: si legge chi la segue.
export function TabellaAzioniIstruttori({ azioni, io, torna }: { azioni: AzioneIstruttore[]; io: Io; torna: string }) {
  return (
    <div className="tabella-scorre">
      <table className="schede-mobile tabella-colonne tabella-uniforme">
        <thead>
          <tr>
            <th>Persona</th>
            <th>Situazione</th>
            <th>Azione</th>
          </tr>
        </thead>
        <tbody>
          {azioni.map((a) => {
            const mia = a.assegnato_a != null && a.assegnato_a === io?.id
            const esito = ESITI_AZIONE.find((e) => e.chiave === a.esito)
            return (
              <tr key={a.id}>
                <td>
                  <div className="riga-dati">
                    <Persona id={a.utente_id} nome={a.nome} cognome={a.cognome} nuovaScheda />
                    <Contatti telefono={a.telefono} email={a.email} />
                    <span className="muto">Iscritto il {formatoData(a.iscritto_il)} · {giorniFa(a.iscritto_il)}</span>
                  </div>
                </td>
                <td>
                  <div className="riga-dati">
                    <span className="normale">{situazione(a)}</span>
                    {!a.completato_il && (
                      <span className="etichetta-riga">
                        {a.giorni_ritardo > 0 ? <span className="bollino rosso">In ritardo di {a.giorni_ritardo} {a.giorni_ritardo === 1 ? 'giorno' : 'giorni'}</span> : <span className="bollino grigio">Oggi</span>}
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  {a.completato_il ? (
                    <div className="riga-dati">
                      {esito && <span className="etichetta-riga"><span className={`bollino ${esito.tono}`}>{esito.testo}</span></span>}
                      <span className="muto">{a.completato_da_nome ?? '—'} · {formatoDataOra(a.completato_il)}</span>
                      {a.nota && <span className="normale">{a.nota}</span>}
                    </div>
                  ) : mia ? (
                    <div className="riga-dati">
                      <form action={completaAzioneIstruttore} className="azioni-riga">
                        <input type="hidden" name="azione" value={a.id} />
                        <input type="hidden" name="torna" value={torna} />
                        <input type="text" name="nota" placeholder="Una nota (facoltativa)" aria-label="Nota" />
                        {ESITI_AZIONE.map((e, i) => (
                          <button key={e.chiave} className={i === 0 ? 'bottone piccolo' : 'bottone secondario piccolo'} name="esito" value={e.chiave}>
                            {e.breve}
                          </button>
                        ))}
                      </form>
                      <form action={lasciaAzioneIstruttore}>
                        <input type="hidden" name="azione" value={a.id} />
                        <input type="hidden" name="torna" value={torna} />
                        <button className="bottone secondario piccolo">Rimetti fra le libere</button>
                      </form>
                    </div>
                  ) : a.assegnato_a && !ha(io, 'lead_altrui') ? (
                    <span className="muto">In carico a {a.assegnato_nome ?? '—'}</span>
                  ) : (
                    <div className="riga-dati">
                      {a.assegnato_a && <span className="muto">In carico a {a.assegnato_nome ?? '—'}</span>}
                      <form action={prendiAzioneIstruttore}>
                        <input type="hidden" name="azione" value={a.id} />
                        <input type="hidden" name="torna" value={torna} />
                        <button className="bottone piccolo">Prendi in carico</button>
                      </form>
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
