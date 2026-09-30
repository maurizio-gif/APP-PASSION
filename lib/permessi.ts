import type { Io, Ruolo } from '@/lib/crm'

// Chi vede cosa. Le chiavi sono quelle del database (public.staff.sezioni e
// public.staff.autorizzazioni, migrazione 20260928q), che le controlla da
// solo: qui servono per il menu e per le etichette della pagina Utenti.
// Un admin vede tutto e puo' tutto; la home e la scheda persona le vedono tutti.

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
  { chiave: 'curriculum', href: '/dashboard/curriculum', testo: 'Curriculum' },
] as const

export type Sezione = (typeof SEZIONI)[number]['chiave']

// Sezioni spente per tutti, admin compresi: non compaiono nel menu, nella home,
// nella scheda persona ne' fra le spunte di Utenti, e la pagina rimanda alla
// home. I dati intanto continuano ad arrivare, e chi le aveva le ritrova
// quando si riaccendono (basta toglierle da qui).
export const SOSPESE: readonly Sezione[] = ['contratti']
export const SEZIONI_ATTIVE = SEZIONI.filter((s) => !SOSPESE.includes(s.chiave))

export const AUTORIZZAZIONI = [
  { chiave: 'lead_altrui', testo: 'Lead degli altri', descrizione: 'riassegnare e chiudere anche i lead, le disdette e i rinnovi in carico a un altro' },
  { chiave: 'gestione_utenti', testo: 'Gestione utenti', descrizione: 'aprire Utenti e cambiare sezioni e autorizzazioni' },
] as const

export type Autorizzazione = (typeof AUTORIZZAZIONI)[number]['chiave']

// I ruoli (supabase/migrations/20260930a_ruoli.sql). Superadmin, admin e
// supporto hanno i poteri di un admin: vedono tutte le sezioni e hanno tutte le
// autorizzazioni. Il supporto in piu' smista i ticket del desk; il superadmin
// (R2D) li lavora e li chiude, e scrive le modifiche.
export const RUOLI: { chiave: Ruolo; testo: string; descrizione: string }[] = [
  { chiave: 'superadmin', testo: 'Superadmin', descrizione: 'R2D: vede e può tutto, lavora e chiude i ticket, scrive le modifiche' },
  { chiave: 'admin', testo: 'Admin', descrizione: 'vede tutto e può tutto; i suoi ticket passano dal supporto' },
  { chiave: 'supporto', testo: 'Admin + supporto', descrizione: 'come un admin, e riceve i ticket aperti dagli altri: li verifica e li manda a R2D' },
  { chiave: 'consulente', testo: 'Consulente', descrizione: 'vede le sezioni e ha le autorizzazioni scelte qui sotto' },
]
export const testoRuolo = (ruolo: string | null | undefined) => RUOLI.find((r) => r.chiave === ruolo)?.testo ?? ruolo ?? '—'
export const ruoloAdmin = (ruolo: string | null | undefined) => ruolo === 'superadmin' || ruolo === 'admin' || ruolo === 'supporto'

export const eAdmin = (io: Io) => ruoloAdmin(io?.ruolo)
export const eSuperadmin = (io: Io) => io?.ruolo === 'superadmin'
// Chi puo' dare o togliere un ruolo, o toccare chi ce l'ha (crm.puo_toccare_ruolo()):
// un superadmin solo un superadmin, un admin o un supporto solo un admin.
export const puoToccareRuolo = (io: Io, ruolo: string) =>
  ruolo === 'superadmin' ? eSuperadmin(io) : ruoloAdmin(ruolo) ? eAdmin(io) : true
export const puoVedere = (io: Io, sezione: Sezione) =>
  !SOSPESE.includes(sezione) && (eAdmin(io) || Boolean(io?.sezioni.includes(sezione)))
export const ha = (io: Io, autorizzazione: Autorizzazione) => eAdmin(io) || Boolean(io?.autorizzazioni.includes(autorizzazione))

// I ticket (supabase/migrations/20260930b_ticket.sql): tutti scrivono, il
// supporto (e R2D) verifica e manda a R2D, il superadmin lavora e chiude.
// I report delle riunioni: superadmin e admin (crm.puo_riunioni()).
export const puoRiunioni = (io: Io) => io?.ruolo === 'superadmin' || io?.ruolo === 'admin'

export const smista = (io: Io) => io?.ruolo === 'supporto' || io?.ruolo === 'superadmin'
export const assiste = (io: Io) => eSuperadmin(io)

// Riassegnare, rimettere da assegnare o chiudere un lead, una disdetta o un
// rinnovo: se e' libero, se e' mio, o con l'autorizzazione (crm.puo_gestire()).
export const puoGestire = (io: Io, assegnatoA: string | null) => ha(io, 'lead_altrui') || !assegnatoA || assegnatoA === io?.id
