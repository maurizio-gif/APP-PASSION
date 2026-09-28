import type { Io, Utente } from '@/lib/crm'
import { formatoDataOra } from '@/lib/formato'
import { AUTORIZZAZIONI, eAdmin, SEZIONI } from '@/lib/permessi'
import { BottoneInvio } from '@/components/BottoneInvio'
import { aggiornaUtente } from '@/app/dashboard/azioni'

// Un operatore nella pagina Utenti: ruolo, accesso, sezioni e autorizzazioni,
// con il suo Salva. Quello che non si puo' cambiare (il proprio ruolo, un admin
// per chi admin non e') resta visibile ma spento; il database lo rifiuterebbe.
export function SchedaUtente({ u, io }: { u: Utente; io: Io }) {
  const ioStesso = u.id === io?.id
  // Un admin lo modifica solo un altro admin.
  const bloccato = u.ruolo === 'admin' && !eAdmin(io)
  const admin = u.ruolo === 'admin'

  return (
    <form action={aggiornaUtente} className="scheda utente" id={`u-${u.id}`}>
      <input type="hidden" name="utente" value={u.id} />
      <div className="utente-testa">
        <div>
          <h3>
            {u.nome} {u.cognome}
          </h3>
          <div className="piccolo attenuato">{u.email ?? 'senza email'}</div>
        </div>
        <div className="utente-bollini">
          {admin && <span className="bollino rosso">Admin</span>}
          {ioStesso && <span className="bollino grigio">Sei tu</span>}
          {u.accesso ? (
            <span className="bollino verde" title={u.ultimo_accesso ? `ultimo accesso ${formatoDataOra(u.ultimo_accesso)}` : undefined}>
              ✓ {u.ultimo_accesso ? `entrato il ${formatoDataOra(u.ultimo_accesso).slice(0, 10)}` : 'accesso creato'}
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
                  <option value={u.ruolo}>{admin ? 'Admin' : 'Consulente'}</option>
                </select>
              </>
            ) : (
              <select name="ruolo" defaultValue={u.ruolo}>
                <option value="consulente">Consulente</option>
                {(eAdmin(io) || admin) && <option value="admin">Admin</option>}
              </select>
            )}
          </label>
          <label className="spunta">
            {ioStesso && u.attivo && <input type="hidden" name="attivo" value="on" />}
            <input type="checkbox" name="attivo" defaultChecked={u.attivo} disabled={ioStesso} />
            Attivo
          </label>
        </div>

        <div className="utente-gruppo">
          <div className="utente-etichetta">
            Sezioni
            {admin && <span className="attenuato"> · un admin le vede tutte</span>}
          </div>
          <div className="spunte">
            {SEZIONI.map((s) => (
              <label key={s.chiave} className="chip">
                <input type="checkbox" name="sezioni" value={s.chiave} defaultChecked={admin || u.sezioni.includes(s.chiave)} />
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
                  {mia && <input type="hidden" name="autorizzazioni" value={a.chiave} />}
                  <input type="checkbox" name="autorizzazioni" value={a.chiave} defaultChecked={admin || u.autorizzazioni.includes(a.chiave)} disabled={mia} />
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
  )
}
