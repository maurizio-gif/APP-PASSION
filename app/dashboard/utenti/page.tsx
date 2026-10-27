import Link from 'next/link'
import { redirect } from 'next/navigation'
import { crm } from '@/lib/crm'
import { ha, puoToccareRuolo, RUOLI } from '@/lib/permessi'
import { Avviso } from '@/components/Ui'
import { BottoneInvio } from '@/components/BottoneInvio'
import { SchedaUtente } from '@/components/SchedaUtente'
import { invitaIstruttori, nuovoUtente } from '../azioni'

// Utenti: per ogni operatore dello staff, cosa vede (le sezioni del menu) e
// cosa puo' fare (le autorizzazioni). Le regole le controlla il database
// (supabase/migrations/20260928q_utenti_catene_guest_pass.sql): un admin vede
// tutto; nessuno cambia il proprio ruolo o si toglie l'accesso da solo; i
// ruoli admin e supporto li da' e li toglie solo un admin, il ruolo superadmin
// solo un superadmin (20260930a_ruoli.sql). Un utente si rimuove dalla sua
// scheda (20260929e_utenti_rimuovi.sql).
// Senza accenti e in minuscolo: «Nicolo» trova «Nicolò».
const semplice = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export default async function Utenti({ searchParams }: { searchParams: { errore?: string; ok?: string; q?: string } }) {
  const io = await crm.io()
  if (!ha(io, 'gestione_utenti')) redirect(`/dashboard?errore=${encodeURIComponent('La gestione utenti non è abilitata per te.')}`)
  const utenti = await crm.utenti()
  const attivi = utenti.filter((u) => u.attivo)
  // La ricerca: nome e cognome (in qualsiasi ordine) o email. Le parole devono esserci tutte. Il passaggio
  // del lavoro a un collega (`operatori`) guarda sempre tutti gli attivi, non solo quelli trovati.
  const q = searchParams.q?.trim().slice(0, 80) || ''
  const parole = semplice(q).split(/\s+/).filter(Boolean)
  const trovato = (u: (typeof utenti)[number]) => {
    const testo = semplice(`${u.nome} ${u.cognome ?? ''} ${u.email ?? ''}`)
    return parole.every((w) => testo.includes(w))
  }
  const attiviVisti = parole.length ? attivi.filter(trovato) : attivi
  const spentiVisti = parole.length ? utenti.filter((u) => !u.attivo && trovato(u)) : utenti.filter((u) => !u.attivo)
  const spenti = spentiVisti
  // Gli istruttori creati con la sola sezione Appello e senza accesso: li invita un pulsante solo.
  const soloAppello = attivi.filter((u) => !u.accesso && u.sezioni.length === 1 && u.sezioni[0] === 'appello')
  // Si invitano solo quelli con lezioni in calendario: gli altri non hanno niente da verificare.
  const conLezioni = new Set(soloAppello.length > 0 ? (await crm.istruttoriConLezioni()).map((x) => x.staff_id) : [])
  const daInvitare = soloAppello.filter((u) => conLezioni.has(u.id))
  const senzaLezioni = soloAppello.filter((u) => !conLezioni.has(u.id))

  return (
    <>
      <div className="testata">
        <div>
          <h1>Utenti</h1>
          <p>Chi entra nell’app, quali sezioni vede e cosa può fare. La home e la scheda persona le vedono tutti.</p>
        </div>
      </div>
      <Avviso errore={searchParams.errore} ok={searchParams.ok} />

      <form className="filtri" action="/dashboard/utenti">
        <input type="search" name="q" defaultValue={q} placeholder="Cerca per nome e cognome o email" aria-label="Cerca un utente" />
        <button className="bottone secondario" type="submit">
          Cerca
        </button>
        {q && <Link href="/dashboard/utenti">Azzera</Link>}
      </form>
      {q && (
        <p className="piccolo attenuato">
          {attiviVisti.length + spenti.length} {attiviVisti.length + spenti.length === 1 ? 'utente trovato' : 'utenti trovati'} per «{q}»
          {spenti.length > 0 ? ` (${spenti.length} non più attivi)` : ''}.
        </p>
      )}

      <div className="utenti">
        {attiviVisti.length === 0 && q && spenti.length === 0 && <p className="vuoto">Nessun utente trovato.</p>}
        {attiviVisti.map((u) => (
          <SchedaUtente key={u.id} u={u} io={io} operatori={attivi} />
        ))}
      </div>

      {spenti.length > 0 && (
        <details className="scheda" open={Boolean(q)}>
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

      {daInvitare.length > 0 && (
        <section className="scheda">
          <h2>Istruttori da invitare</h2>
          <p className="piccolo attenuato sotto-titolo">
            {daInvitare.length} {daInvitare.length === 1 ? 'istruttore ha' : 'istruttori hanno'} solo la sezione «Appello istruttore» e non {daInvitare.length === 1 ? 'ha' : 'hanno'} ancora
            l’accesso e lezioni in calendario: {daInvitare.map((u) => `${u.nome} ${u.cognome ?? ''}`.trim()).join(', ')}. Con un clic arriva a tutti l’email con il link per scegliere la password.
            Chi ha già l’accesso o l’invito non viene toccato.
          </p>
          {senzaLezioni.length > 0 && (
            <p className="piccolo attenuato">
              Non compresi, perché non hanno lezioni in calendario su PerfectGym: {senzaLezioni.map((u) => `${u.nome} ${u.cognome ?? ''}`.trim()).join(', ')}. Se serve, li inviti
              a mano dalla loro scheda.
            </p>
          )}
          <form action={invitaIstruttori} className="modulo">
            <label className="spunta">
              <input type="checkbox" required /> Confermo: mando l’email a {daInvitare.length} {daInvitare.length === 1 ? 'persona' : 'persone'}
            </label>
            <BottoneInvio testo={`Invita ${daInvitare.length === 1 ? 'l’istruttore' : `i ${daInvitare.length} istruttori`}`} inCorso="Invio…" />
          </form>
        </section>
      )}

      <section className="scheda">
        <h2>Nuovo utente</h2>
        <p className="piccolo attenuato sotto-titolo">
          Nasce con le sezioni operative (Opportunità, Prove, Disdette, Rinnovi, Task, Cerca, Debitori); il resto lo si abilita qui sopra.
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
