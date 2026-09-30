import { redirect } from 'next/navigation'
import { crm } from '@/lib/crm'
import { ha, puoToccareRuolo, RUOLI } from '@/lib/permessi'
import { Avviso } from '@/components/Ui'
import { BottoneInvio } from '@/components/BottoneInvio'
import { SchedaUtente } from '@/components/SchedaUtente'
import { nuovoUtente } from '../azioni'

// Utenti: per ogni operatore dello staff, cosa vede (le sezioni del menu) e
// cosa puo' fare (le autorizzazioni). Le regole le controlla il database
// (supabase/migrations/20260928q_utenti_catene_guest_pass.sql): un admin vede
// tutto; nessuno cambia il proprio ruolo o si toglie l'accesso da solo; i
// ruoli admin e supporto li da' e li toglie solo un admin, il ruolo superadmin
// solo un superadmin (20260930a_ruoli.sql). Un utente si rimuove dalla sua
// scheda (20260929e_utenti_rimuovi.sql).
export default async function Utenti({ searchParams }: { searchParams: { errore?: string; ok?: string } }) {
  const io = await crm.io()
  if (!ha(io, 'gestione_utenti')) redirect(`/dashboard?errore=${encodeURIComponent('La gestione utenti non è abilitata per te.')}`)
  const utenti = await crm.utenti()
  const attivi = utenti.filter((u) => u.attivo)
  const spenti = utenti.filter((u) => !u.attivo)

  return (
    <>
      <div className="testata">
        <div>
          <h1>Utenti</h1>
          <p>Chi entra nell’app, quali sezioni vede e cosa può fare. La home e la scheda persona le vedono tutti.</p>
        </div>
      </div>
      <Avviso errore={searchParams.errore} ok={searchParams.ok} />

      <div className="utenti">
        {attivi.map((u) => (
          <SchedaUtente key={u.id} u={u} io={io} operatori={attivi} />
        ))}
      </div>

      {spenti.length > 0 && (
        <details className="scheda">
          <summary>
            <strong>Non più attivi</strong> <span className="attenuato">· {spenti.length}</span>
          </summary>
          <div className="utenti">
            {spenti.map((u) => (
              <SchedaUtente key={u.id} u={u} io={io} operatori={attivi} />
            ))}
          </div>
        </details>
      )}

      <section className="scheda">
        <h2>Nuovo utente</h2>
        <p className="piccolo attenuato sotto-titolo">
          Nasce con le sezioni operative (Lead, Prove, Disdette, Rinnovi, Task, Cerca, Debitori); il resto lo si abilita qui sopra.
          Appena creato gli arriva un’email di invito con il link per scegliere la password.
        </p>
        <form action={nuovoUtente} className="modulo nuovo-utente">
          <div className="campo">
            <label htmlFor="nu-nome">Nome</label>
            <input id="nu-nome" type="text" name="nome" required />
          </div>
          <div className="campo">
            <label htmlFor="nu-cognome">Cognome</label>
            <input id="nu-cognome" type="text" name="cognome" />
          </div>
          <div className="campo">
            <label htmlFor="nu-email">Email</label>
            <input id="nu-email" type="email" name="email" required />
          </div>
          <div className="campo">
            <label htmlFor="nu-ruolo">Ruolo</label>
            <select id="nu-ruolo" name="ruolo" defaultValue="consulente">
              {RUOLI.filter((r) => puoToccareRuolo(io, r.chiave)).map((r) => <option key={r.chiave} value={r.chiave}>{r.testo}</option>)}
            </select>
          </div>
          <div className="campo invio">
            <BottoneInvio testo="Crea utente" inCorso="Creo…" />
          </div>
        </form>
      </section>
    </>
  )
}
