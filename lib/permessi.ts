import type { Io } from '@/lib/crm'

// Chi vede cosa. Le chiavi sono quelle del database (public.staff.sezioni e
// public.staff.autorizzazioni, migrazione 20260928q), che le controlla da
// solo: qui servono per il menu e per le etichette della pagina Utenti.
// Un admin vede tutto e puo' tutto; la home e la scheda persona le vedono tutti.

export const SEZIONI = [
  { chiave: 'lead', href: '/dashboard/lead', testo: 'Lead' },
  { chiave: 'prove', href: '/dashboard/prove', testo: 'Prove' },
  { chiave: 'contratti', href: '/dashboard/contratti', testo: 'Nuovi contratti' },
  { chiave: 'disdette', href: '/dashboard/disdette', testo: 'Disdette' },
  { chiave: 'task', href: '/dashboard/task', testo: 'Task' },
  { chiave: 'cerca', href: '/dashboard/cerca', testo: 'Cerca' },
  { chiave: 'abbonamenti', href: '/dashboard/abbonamenti', testo: 'Abbonamenti' },
] as const

export type Sezione = (typeof SEZIONI)[number]['chiave']

export const AUTORIZZAZIONI = [
  { chiave: 'lead_altrui', testo: 'Lead degli altri', descrizione: 'riassegnare e chiudere anche i lead in carico a un altro' },
  { chiave: 'gestione_utenti', testo: 'Gestione utenti', descrizione: 'aprire Utenti e cambiare sezioni e autorizzazioni' },
] as const

export type Autorizzazione = (typeof AUTORIZZAZIONI)[number]['chiave']

export const eAdmin = (io: Io) => io?.ruolo === 'admin'
export const puoVedere = (io: Io, sezione: Sezione) => eAdmin(io) || Boolean(io?.sezioni.includes(sezione))
export const ha = (io: Io, autorizzazione: Autorizzazione) => eAdmin(io) || Boolean(io?.autorizzazioni.includes(autorizzazione))

// Riassegnare o chiudere un lead: se e' libero, se e' mio, o con l'autorizzazione.
export const puoGestireLead = (io: Io, assegnatoA: string | null) => ha(io, 'lead_altrui') || !assegnatoA || assegnatoA === io?.id
