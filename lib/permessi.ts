import type { Io } from '@/lib/crm'

// Chi vede cosa. Le chiavi sono quelle del database (public.staff.sezioni e
// public.staff.autorizzazioni, migrazione 20260928q), che le controlla da
// solo: qui servono per il menu e per le etichette della pagina Utenti.
// Un admin vede tutto e puo' tutto (tranne le autorizzazioni ESPLICITE); la
// home e la scheda persona le vedono tutti.

export const SEZIONI = [
  { chiave: 'lead', href: '/dashboard/lead', testo: 'Lead' },
  { chiave: 'prove', href: '/dashboard/prove', testo: 'Prove' },
  { chiave: 'contratti', href: '/dashboard/contratti', testo: 'Nuovi contratti' },
  { chiave: 'disdette', href: '/dashboard/disdette', testo: 'Disdette' },
  { chiave: 'rinnovi', href: '/dashboard/rinnovi', testo: 'Rinnovi' },
  { chiave: 'task', href: '/dashboard/task', testo: 'Task' },
  { chiave: 'cerca', href: '/dashboard/cerca', testo: 'Cerca' },
  { chiave: 'debitori', href: '/dashboard/debitori', testo: 'Debitori' },
  { chiave: 'abbonamenti', href: '/dashboard/abbonamenti', testo: 'Abbonamenti' },
  { chiave: 'ticket', href: '/dashboard/ticket', testo: 'Ticket' },
] as const

export type Sezione = (typeof SEZIONI)[number]['chiave']

// Sezioni spente per tutti, admin compresi: non compaiono nel menu, nella home,
// nella scheda persona ne' fra le spunte di Utenti, e la pagina rimanda alla
// home. I dati intanto continuano ad arrivare, e chi le aveva le ritrova
// quando si riaccendono (basta toglierle da qui).
export const SOSPESE: readonly Sezione[] = ['contratti']
export const SEZIONI_ATTIVE = SEZIONI.filter((s) => !SOSPESE.includes(s.chiave))

export const AUTORIZZAZIONI = [
  { chiave: 'lead_altrui', testo: 'Lead degli altri', descrizione: 'riassegnare e chiudere anche i lead in carico a un altro' },
  { chiave: 'gestione_utenti', testo: 'Gestione utenti', descrizione: 'aprire Utenti e cambiare sezioni e autorizzazioni' },
  { chiave: 'ticket_smistamento', testo: 'Smistamento ticket', descrizione: 'verificare le segnalazioni del desk, risolverle, unirle o mandarle a R2D' },
  { chiave: 'ticket_assistenza', testo: 'Assistenza R2D', descrizione: 'lavorare e chiudere i ticket, scrivere le modifiche: solo per lo staff di R2D' },
] as const

export type Autorizzazione = (typeof AUTORIZZAZIONI)[number]['chiave']

// Le autorizzazioni che un admin non ha d'ufficio: si danno una per una,
// anche agli admin. L'assistenza R2D decide da che parte scrive un operatore
// nei ticket, e un admin di Passion resta Passion.
export const ESPLICITE: readonly Autorizzazione[] = ['ticket_assistenza']

export const eAdmin = (io: Io) => io?.ruolo === 'admin'
export const puoVedere = (io: Io, sezione: Sezione) =>
  !SOSPESE.includes(sezione) && (eAdmin(io) || Boolean(io?.sezioni.includes(sezione)))
export const ha = (io: Io, autorizzazione: Autorizzazione) =>
  (eAdmin(io) && !ESPLICITE.includes(autorizzazione)) || Boolean(io?.autorizzazioni.includes(autorizzazione))

// I ticket (supabase/migrations/20260930a_ticket.sql): tutti scrivono, chi
// smista verifica e manda a R2D, l'assistenza R2D lavora e chiude.
export const smista = (io: Io) => ha(io, 'ticket_smistamento')
export const assiste = (io: Io) => ha(io, 'ticket_assistenza')

// Riassegnare o chiudere un lead: se e' libero, se e' mio, o con l'autorizzazione.
export const puoGestireLead = (io: Io, assegnatoA: string | null) => ha(io, 'lead_altrui') || !assegnatoA || assegnatoA === io?.id
