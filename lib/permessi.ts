import type { Io, Ruolo } from '@/lib/crm'

// Chi vede cosa. Le chiavi sono quelle del database (public.staff.sezioni e
// public.staff.autorizzazioni, migrazione 20260928q), che le controlla da
// solo: qui servono per il menu e per le etichette della pagina Utenti.
// Un admin vede tutto e puo' tutto; la home e la scheda persona le vedono tutti.

export const SEZIONI = [
  { chiave: 'lead', href: '/dashboard/lead', testo: 'Opportunità' },
  { chiave: 'prove', href: '/dashboard/prove', testo: 'Prove' },
  { chiave: 'contratti', href: '/dashboard/contratti', testo: 'Nuovi contratti' },
  { chiave: 'disdette', href: '/dashboard/disdette', testo: 'Disdette' },
  { chiave: 'rinnovi', href: '/dashboard/rinnovi', testo: 'Rinnovi' },
  { chiave: 'task', href: '/dashboard/task', testo: 'Task' },
  { chiave: 'cerca', href: '/dashboard/cerca', testo: 'Cerca' },
  { chiave: 'debitori', href: '/dashboard/debitori', testo: 'Debitori' },
  { chiave: 'abbonamenti', href: '/dashboard/abbonamenti', testo: 'Abbonamenti' },
  { chiave: 'marketing', href: '/dashboard/marketing', testo: 'Campagne' },
  { chiave: 'ticket', href: '/dashboard/ticket', testo: 'Ticket' },
  { chiave: 'curriculum', href: '/dashboard/curriculum', testo: 'Curriculum' },
  // L'appello (20261027i): l'istruttore segna le presenze delle sue lezioni; l'appello complessivo
  // e' di tutte le lezioni, da leggere, per gli admin e i consulenti.
  { chiave: 'appello', href: '/dashboard/appello', testo: 'Appello istruttore' },
  { chiave: 'appello_tutte', href: '/dashboard/appello-tutte', testo: 'Appello complessivo' },
  // Le azioni per gli istruttori (20261110a): le vede chi e' nel cluster «Istruttori · nuovi iscritti»
  // (si sceglie in Utenti, non fra le sezioni) e gli admin.
  { chiave: 'azioni_istruttori', href: '/dashboard/azioni-istruttori', testo: 'Azioni istruttore' },
  // Le regole delle automazioni (quanti giorni, quale categoria, quali abbonamenti...): gli admin, e chi la riceve.
  { chiave: 'automazioni', href: '/dashboard/automazioni', testo: 'Impostazioni automazioni' },
  // Quante persone, dopo un'azione degli istruttori, attivano Formula 8 (20261111a): gli admin, e chi la riceve.
  { chiave: 'efficacia_azioni', href: '/dashboard/efficacia-azioni', testo: 'Efficacia azioni' },
  // Le liste di persone da scaricare per le newsletter (20261111c): gli admin, chi ha la sezione Campagne e chi la riceve.
  { chiave: 'liste_newsletter', href: '/dashboard/liste-newsletter', testo: 'Liste newsletter' },
] as const

export type Sezione = (typeof SEZIONI)[number]['chiave']

// Sezioni spente per tutti, admin compresi: non compaiono nel menu, nella home,
// nella scheda persona ne' fra le spunte di Utenti, e la pagina rimanda alla
// home. I dati intanto continuano ad arrivare, e chi le aveva le ritrova
// quando si riaccendono (basta toglierle da qui).
export const SOSPESE: readonly Sezione[] = ['contratti']
export const SEZIONI_ATTIVE = SEZIONI.filter((s) => !SOSPESE.includes(s.chiave))

// Sezioni che nemmeno un admin vede d'ufficio: le vede solo chi le riceve in
// Utenti, una persona alla volta (crm.puo_vedere(), 20261020c).
export const SEZIONI_PER_PERSONA: readonly Sezione[] = ['marketing']

// Sezioni che non hanno una spunta fra le sezioni di Utenti: si ricevono con un cluster.
export const SEZIONI_DA_CLUSTER: readonly Sezione[] = ['azioni_istruttori']

// I cluster (20261110a): gruppi di operatori che ricevono azioni dedicate, create dalle
// automazioni. Si abilitano dalla scheda di ciascun utente.
export const CLUSTER = [
  {
    chiave: 'istruttori_nuovi_iscritti',
    testo: 'Istruttori · nuovi iscritti',
    descrizione: 'riceve le azioni per i nuovi iscritti che non si sono ancora abbonati e vede la sezione «Azioni istruttore»',
  },
] as const
export type Cluster = (typeof CLUSTER)[number]['chiave']

export const AUTORIZZAZIONI = [
  { chiave: 'lead_altrui', testo: 'Opportunità degli altri', descrizione: 'riassegnare e chiudere anche le opportunità, le disdette e i rinnovi in carico a un altro' },
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
// L'Appello complessivo lo vedono anche i consulenti (chi riceve le opportunita'), senza spunta in Utenti.
export const puoVedere = (io: Io, sezione: Sezione) =>
  !SOSPESE.includes(sezione) &&
  (Boolean(io?.sezioni.includes(sezione)) ||
    (eAdmin(io) && !SEZIONI_PER_PERSONA.includes(sezione)) ||
    (sezione === 'appello_tutte' && Boolean(io?.assegnabile)) ||
    (sezione === 'liste_newsletter' && Boolean(io?.sezioni.includes('marketing'))) ||
    (sezione === 'azioni_istruttori' && Boolean(io?.cluster?.includes('istruttori_nuovi_iscritti'))))
// Chi lavora solo da istruttore: e' nel cluster, non e' admin e non ha nessuna sezione dei consulenti (le sezioni
// sospese, come Nuovi contratti, non contano: nessuno le vede). Per
// lui il menu e la home sono quelli degli istruttori (Azioni istruttore, Appello), a parte dal lavoro dei consulenti.
const SEZIONI_CONSULENTE: readonly Sezione[] = ['lead', 'prove', 'contratti', 'disdette', 'rinnovi', 'task', 'cerca', 'debitori', 'abbonamenti', 'marketing']
export const soloIstruttore = (io: Io) =>
  Boolean(io) && !eAdmin(io) && Boolean(io?.cluster?.includes('istruttori_nuovi_iscritti')) && !io!.sezioni.some((s) => SEZIONI_CONSULENTE.some((c) => c === s && !SOSPESE.includes(c)))
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
