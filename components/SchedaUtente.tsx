'use client'

import { useState } from 'react'
import type { Io, Utente } from '@/lib/crm'
import { formatoDataOra } from '@/lib/formato'
import { AUTORIZZAZIONI, eAdmin, SEZIONI_ATTIVE, SOSPESE } from '@/lib/permessi'
import { BottoneInvio } from '@/components/BottoneInvio'
import { aggiornaUtente, invitaUtente, rimuoviUtente } from '@/app/dashboard/azioni'

// Un operatore nella pagina Utenti: ruolo, accesso, sezioni e autorizzazioni,
// con il suo Salva. Quello che non si puo' cambiare (il proprio ruolo, un admin
// per chi admin non e') resta visibile ma spento; il database lo rifiuterebbe.
// Un admin vede tutte le sezioni e ha tutte le autorizzazioni: finche' il ruolo
// scelto e' Admin le spunte sono accese e ferme (e quelle salvate si tengono,
// per quando tornasse consulente); scegliendo Consulente si possono cambiare.
// Sotto: l'invito (o il link per la password) e la rimozione, passando il suo
// lavoro aperto a uno degli `operatori`.
export function SchedaUtente({ u, io, operatori }: { u: Utente; io: Io; operatori: Utente[] }) {
  const ioStesso = u.id === io?.id
  // Un admin lo modifica solo un altro admin.
  const bloccato = u.ruolo === 'admin' && !eAdmin(io)
  const [ruolo, setRuolo] = useState(u.ruolo)
  const admin = ruolo === 'admin'
  const aperto = u.lead_aperti + u.task_aperti + u.altro_aperto

  return (
    <div className="scheda utente" id={`u-${u.id}`}>
      <form action={aggiornaUtente}>
        <input type="hidden" name="utente" value={u.id} />
        <div className="utente-testa">
          <div>
            <h3>
              {u.nome} {u.cognome}
            </h3>
            <div className="piccolo attenuato">{u.email ?? 'senza email'}</div>
          </div>
          <div className="utente-bollini">
            {u.ruolo === 'admin' && <span className="bollino rosso">Admin</span>}
            {ioStesso && <span className="bollino grigio">Sei tu</span>}
            {u.accesso ? (
              <span className="bollino verde" title={u.ultimo_accesso ? `ultimo accesso ${formatoDataOra(u.ultimo_accesso)}` : undefined}>
                ✓ {u.ultimo_accesso ? `entrato il ${formatoDataOra(u.ultimo_accesso).slice(0, 10)}` : 'invitato, non ancora entrato'}
              </span>
            ) : (
              <span className="bollino giallo">! senza accesso</span>
            )}
          </div>
        </div>

        <fieldset disabled={bloccato}>
          <div className="utente-riga">
            <label className="campo-breve">
              Ruolo
              {ioStesso ? (
                <>
                  <input type="hidden" name="ruolo" value={u.ruolo} />
                  <select value={u.ruolo} disabled>
                    <option value={u.ruolo}>{u.ruolo === 'admin' ? 'Admin' : 'Consulente'}</option>
                  </select>
                </>
              ) : (
                <select name="ruolo" value={ruolo} onChange={(e) => setRuolo(e.target.value as Utente['ruolo'])}>
                  <option value="consulente">Consulente</option>
                  {(eAdmin(io) || u.ruolo === 'admin') && <option value="admin">Admin</option>}
                </select>
              )}
            </label>
            <label className="spunta">
              {ioStesso && u.attivo && <input type="hidden" name="attivo" value="on" />}
              <input type="checkbox" name="attivo" defaultChecked={u.attivo} disabled={ioStesso} />
              Attivo
            </label>
          </div>

          {/* Da admin le spunte sono spente, e le spunte spente non partono col
              modulo: quelle salvate viaggiano nascoste. */}
          {admin && u.sezioni.map((s) => <input key={s} type="hidden" name="sezioni" value={s} />)}
          {/* Le sezioni sospese non si vedono, ma chi le aveva le tiene. */}
          {!admin && u.sezioni.filter((s) => SOSPESE.some((x) => x === s)).map((s) => <input key={s} type="hidden" name="sezioni" value={s} />)}
          {admin && u.autorizzazioni.map((a) => <input key={a} type="hidden" name="autorizzazioni" value={a} />)}

          <div className="utente-gruppo">
            <div className="utente-etichetta">
              Sezioni
              {admin && <span className="attenuato"> · un admin le vede tutte: per sceglierle, ruolo Consulente</span>}
            </div>
            <div className="spunte">
              {SEZIONI_ATTIVE.map((s) => (
                <label key={s.chiave} className="chip">
                  {admin ? (
                    <input type="checkbox" checked readOnly disabled />
                  ) : (
                    <input type="checkbox" name="sezioni" value={s.chiave} defaultChecked={u.sezioni.includes(s.chiave)} />
                  )}
                  <span>{s.testo}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="utente-gruppo">
            <div className="utente-etichetta">
              Autorizzazioni
              {admin && <span className="attenuato"> · un admin le ha tutte</span>}
            </div>
            <div className="autorizzazioni">
              {AUTORIZZAZIONI.map((a) => {
                const mia = ioStesso && a.chiave === 'gestione_utenti' && u.autorizzazioni.includes(a.chiave)
                return (
                  <label key={a.chiave} className="spunta">
                    {admin ? (
                      <input type="checkbox" checked readOnly disabled />
                    ) : (
                      <>
                        {mia && <input type="hidden" name="autorizzazioni" value={a.chiave} />}
                        <input type="checkbox" name="autorizzazioni" value={a.chiave} defaultChecked={u.autorizzazioni.includes(a.chiave)} disabled={mia} />
                      </>
                    )}
                    <span>
                      <strong>{a.testo}</strong> <span className="attenuato">— {a.descrizione}</span>
                    </span>
                  </label>
                )
              })}
            </div>
          </div>

          {bloccato ? (
            <p className="piccolo attenuato">Un admin lo modifica solo un altro admin.</p>
          ) : (
            <div className="utente-piede">
              {ioStesso && <span className="piccolo attenuato">Ruolo, accesso e gestione utenti li cambia un altro.</span>}
              <BottoneInvio testo="Salva" inCorso="Salvo…" />
            </div>
          )}
        </fieldset>
      </form>

      {!bloccato && u.attivo && u.email && (
        <form action={invitaUtente} className="utente-invito">
          <input type="hidden" name="utente" value={u.id} />
          <span className="piccolo attenuato">
            {u.accesso
              ? 'Ha già l’accesso: se ha perso la password, gli si manda il link per sceglierne una nuova.'
              : 'Non ha ancora l’accesso: gli arriva un’email con il link per scegliere la password.'}
          </span>
          <BottoneInvio testo={u.accesso ? 'Manda link password' : 'Manda invito'} inCorso="Invio…" />
        </form>
      )}

      {!ioStesso && !bloccato && (
        <details className="utente-rimuovi">
          <summary>Rimuovi utente</summary>
          <form action={rimuoviUtente} className="modulo">
            <input type="hidden" name="utente" value={u.id} />
            <p className="piccolo attenuato">
              {aperto > 0
                ? `Ha in mano ${[
                    u.lead_aperti > 0 && `${u.lead_aperti} ${u.lead_aperti === 1 ? 'lead aperto' : 'lead aperti'}`,
                    u.task_aperti > 0 && `${u.task_aperti} ${u.task_aperti === 1 ? 'task aperto' : 'task aperti'}`,
                    u.altro_aperto > 0 && `${u.altro_aperto} fra debitori e rinnovi`,
                  ].filter(Boolean).join(', ')}.`
                : 'Non ha lavoro aperto.'}{' '}
              Non entrerà più (l’accesso in Supabase si cancella); nella storia del CRM resta il suo nome.
            </p>
            {aperto > 0 && (
              <label className="campo-breve">
                Il lavoro aperto passa a
                <select name="passa_a" defaultValue="">
                  <option value="">Nessuno: torna da assegnare</option>
                  {operatori.filter((o) => o.id !== u.id).map((o) => (
                    <option key={o.id} value={o.id}>{o.nome} {o.cognome ?? ''}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="spunta">
              <input type="checkbox" required />
              <span>Sì, rimuovi {u.nome}</span>
            </label>
            <div className="utente-piede">
              <BottoneInvio testo="Rimuovi" inCorso="Rimuovo…" />
            </div>
          </form>
        </details>
      )}
    </div>
  )
}
