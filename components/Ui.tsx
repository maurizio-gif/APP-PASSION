import Link from 'next/link'
import { FASE, FONTE, traduci, nomeCompleto, telefonoLink, whatsappLink } from '@/lib/formato'

// I pezzi che tornano in ogni pagina del CRM.

export function Avviso({ errore, ok }: { errore?: string; ok?: string }) {
  if (errore) return <p className="avviso">{errore}</p>
  if (ok) return <p className="avviso ok">{MESSAGGI_OK[ok] ?? 'Fatto.'}</p>
  return null
}
const MESSAGGI_OK: Record<string, string> = {
  lead: 'Lead creato.',
  utente_salvato: 'Utente salvato.',
  utente_creato: 'Utente creato. Per entrare gli serve l’accesso in Supabase (Authentication → Add user, con la stessa email).',
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

export function Persona({ id, nome, cognome }: { id: string | null; nome: string | null; cognome: string | null }) {
  const n = nomeCompleto(nome, cognome)
  return id ? <Link href={`/dashboard/persone/${id}`}><strong>{n}</strong></Link> : <strong>{n}</strong>
}

export function Contatti({ telefono, email }: { telefono: string | null; email: string | null }) {
  const tel = telefonoLink(telefono)
  const wa = whatsappLink(telefono)
  return (
    <div className="contatti">
      {telefono && (
        <span>
          <a href={tel ?? undefined}>{telefono}</a>
          {wa && <a className="wa" href={wa} target="_blank" rel="noreferrer">WhatsApp</a>}
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
