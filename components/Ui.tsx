import Link from 'next/link'
import { FASE, FONTE, traduci, nomeCompleto, telefonoLink } from '@/lib/formato'

// I pezzi che tornano in ogni pagina del CRM.

export function Avviso({ errore, ok }: { errore?: string; ok?: string }) {
  if (errore) return <p className="avviso">{errore}</p>
  if (ok) return <p className="avviso ok">{MESSAGGI_OK[ok] ?? 'Fatto.'}</p>
  return null
}
const MESSAGGI_OK: Record<string, string> = {
  lead: 'Lead creato, anche su PerfectGym.',
  lead_gia_pgm: 'Lead creato. La persona è già su PerfectGym: lì non si crea un doppione.',
  utente_salvato: 'Utente salvato.',
  utente_cancellato: 'Utente rimosso. Non aveva storia nel CRM: è stato cancellato del tutto, accesso compreso.',
  utente_rimosso: 'Utente rimosso: non entra più e non compare fra gli operatori. Il suo lavoro aperto è passato di mano; nella storia resta il suo nome.',
  utente_creato: 'Utente creato e invitato: gli arriva un’email con il link per scegliere la password.',
  utente_invitato: 'Invito mandato: gli arriva un’email con il link per scegliere la password.',
  utente_link_password: 'Link mandato: gli arriva un’email per scegliere una nuova password.',
}

export function Schede({ voci, attiva, base }: { voci: { chiave: string; testo: string; n?: number }[]; attiva: string; base: string }) {
  return (
    <div className="schede-vista">
      {voci.map((v) => (
        <Link key={v.chiave} href={`${base}${base.includes('?') ? '&' : '?'}vista=${v.chiave}`} className={v.chiave === attiva ? 'attivo' : undefined}>
          {v.testo}
          {v.n != null && <span className="conta">{v.n}</span>}
        </Link>
      ))}
    </div>
  )
}

// `nuovaScheda`: la scheda della persona si apre in un'altra scheda del
// browser (dai Task, per non perdere l'elenco).
export function Persona({ id, nome, cognome, nuovaScheda = false }: {
  id: string | null
  nome: string | null
  cognome: string | null
  nuovaScheda?: boolean
}) {
  const n = nomeCompleto(nome, cognome)
  if (!id) return <strong>{n}</strong>
  return nuovaScheda ? (
    <a href={`/dashboard/persone/${id}`} target="_blank" rel="noopener" title="Apri la scheda in un’altra scheda">
      <strong>{n}</strong> <span className="piccolo">↗</span>
    </a>
  ) : (
    <Link href={`/dashboard/persone/${id}`}><strong>{n}</strong></Link>
  )
}

export function Contatti({ telefono, email }: { telefono: string | null; email: string | null }) {
  const tel = telefonoLink(telefono)
  return (
    <div className="contatti">
      {telefono && (
        <span>
          <a href={tel ?? undefined}>{telefono}</a>
        </span>
      )}
      {email && <a href={`mailto:${email}`}>{email}</a>}
    </div>
  )
}

export function BollinoFonte({ fonte, dettaglio }: { fonte: string | null; dettaglio?: string | null }) {
  if (!fonte) return null
  return (
    <span className={`bollino fonte-${fonte}`} title={dettaglio ?? undefined}>
      {traduci(FONTE, fonte)}
    </span>
  )
}

export function BollinoFase({ fase, esito }: { fase: string; esito?: string | null }) {
  const colore = fase === 'vinta' ? 'verde' : fase === 'persa' ? 'grigio' : fase === 'in_gestione' ? 'giallo' : 'rosso'
  return (
    <span className={`bollino ${colore}`}>
      {traduci(FASE, fase)}
      {fase === 'vinta' && esito ? ` · ${esito}` : ''}
    </span>
  )
}

export function Vuoto({ children }: { children: React.ReactNode }) {
  return <p className="vuoto">{children}</p>
}

// Il modulo di una riga (esito, note, a chi): sul computer sempre aperto; sul
// telefono chiuso dietro un bottone, cosi' le righe restano basse. Solo CSS
// (la casella nascosta apre e chiude), niente JavaScript: funziona anche prima
// che la pagina sia caricata del tutto.
export function Gestione({ id, testo = 'Gestisci', children }: { id: string; testo?: string; children: React.ReactNode }) {
  return (
    <div className="gestione">
      <input type="checkbox" id={`gestione-${id}`} className="gestione-apri" />
      <label htmlFor={`gestione-${id}`} className="bottone secondario piccolo gestione-bottone">{testo}</label>
      <div className="gestione-corpo">{children}</div>
    </div>
  )
}
