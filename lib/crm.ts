import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { puoVedere, type Sezione } from '@/lib/permessi'

// Le letture del CRM: una funzione qui per ogni funzione crm_* del database
// (supabase/migrations/20260928i_crm_app.sql). Il database controlla da solo
// che chi chiama sia nello staff; qui si traducono solo i tipi.

export class NonAutorizzato extends Error {}

export async function rpc<T>(funzione: string, parametri: Record<string, unknown> = {}): Promise<T> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase.rpc(funzione, parametri)
  if (error) {
    if (error.code === '42501') throw new NonAutorizzato(error.message)
    throw new Error(error.message)
  }
  return data as T
}

// Un'Edge Function del progetto, con la sessione di chi e' entrato. L'errore
// che la funzione scrive in `errore` diventa il messaggio.
export async function edge<T>(funzione: string, corpo: Record<string, unknown>): Promise<T> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase.functions.invoke(funzione, { body: corpo })
  if (error) {
    const contesto = (error as { context?: Response }).context
    const dettaglio = contesto ? await contesto.json().catch(() => null) : null
    throw new Error(dettaglio?.errore ?? error.message)
  }
  return data as T
}

// I ruoli: supabase/migrations/20260930a_ruoli.sql e RUOLI in lib/permessi.ts.
export type Ruolo = 'superadmin' | 'admin' | 'supporto' | 'consulente'

export type Io = {
  id: string
  email: string
  nome: string
  cognome: string | null
  ruolo: Ruolo
  sezioni: string[]
  autorizzazioni: string[]
} | null

export type Utente = {
  id: string
  email: string | null
  nome: string
  cognome: string | null
  ruolo: Ruolo
  attivo: boolean
  sezioni: string[]
  autorizzazioni: string[]
  accesso: boolean
  ultimo_accesso: string | null
  lead_aperti: number
  task_aperti: number
  altro_aperto: number
  assegnabile: boolean
}
export type Operatore = { id: string; nome: string; cognome: string | null; ruolo: string }

export type Home = {
  lead_da_gestire: number
  miei_lead: number
  lead_in_gestione: number
  prove_in_scadenza: number
  prove_in_corso: number
  prove_senza_esito: number
  contratti_da_controllare: number
  disdette_da_gestire: number
  miei_task_arretrati: number
  miei_task_oggi: number
  task_senza_assegnatario: number
}

export type Lead = {
  id: string
  utente_id: string
  nome: string | null
  cognome: string | null
  telefono: string | null
  email: string | null
  member_id: number | null
  fonte: Fonte
  fonte_dettaglio: string | null
  attivita_interesse: string | null
  orario_ricontatto: string | null
  presentato_da: string | null
  fase: 'da_gestire' | 'in_gestione' | 'vinta' | 'persa'
  esito: 'prova' | 'contratto' | null
  assegnato_a: string | null
  assegnato_nome: string | null
  preso_in_carico_il: string | null
  creato_il: string
  chiuso_il: string | null
  note: string | null
  commenti: number
  ultimo_commento: string | null
  ultimo_commento_il: string | null
  task_aperti: number
  prossimo_task: string | null
  note_task: string | null
}

export type Fonte = 'sito' | 'tour' | 'referral' | 'meta' | 'altro'

export type Prova = {
  id: string
  utente_id: string
  nome: string | null
  cognome: string | null
  telefono: string | null
  email: string | null
  member_id: number | null
  lead_id: string | null
  fonte: Fonte | null
  fonte_dettaglio: string | null
  contract_id: number | null
  tipo_pass: string | null
  data_inizio: string | null
  data_fine: string | null
  giorni_rimasti: number | null
  gestito_da: string | null
  gestito_nome: string | null
  esito: 'iscritto' | 'non_iscritto' | null
  obiezione: string | null
  note: string | null
  ingressi: number
  ultimo_ingresso: string | null
  prenotazioni: number
  presenze: number
  iscritto_su_pgm: boolean
  task_aperti: number
}

export type NuovoContratto = {
  contract_id: number
  utente_id: string | null
  nome: string | null
  cognome: string | null
  telefono: string | null
  email: string | null
  member_id: number | null
  numero_socio: string | null
  codice_fiscale_pgm: string | null
  piano: string | null
  canone: number | null
  data_firma: string | null
  data_inizio: string | null
  data_fine: string | null
  stato_pgm: string | null
  metodo_pagamento_pgm: boolean | null
  consulente_pgm: string | null
  controllo: 'da_controllare' | 'in_corso' | 'errore' | 'controllato'
  metodo_pagamento_ok: boolean | null
  codice_fiscale_ok: boolean | null
  tesseramento: 'si' | 'gia_presente' | 'no' | null
  numero_tessera: string | null
  errore_asi: string | null
  fonte: string | null
  referral: string | null
  note: string | null
  gestito_nome: string | null
  gestito_il: string | null
  creato_il: string
  gestito_da: string | null
}

export type Disdetta = {
  id: string
  contract_id: number | null
  utente_id: string | null
  nome: string | null
  cognome: string | null
  telefono: string | null
  email: string | null
  member_id: number | null
  piano: string | null
  canone: number | null
  data_firma: string | null
  data_fine: string | null
  data_disdetta: string | null
  esito: 'vinto' | 'perso' | 'standby' | null
  contatto: 'telefonata' | 'appuntamento' | null
  motivo: string | null
  note: string | null
  gestito_nome: string | null
  gestito_il: string | null
  creato_il: string
  gestito_da: string | null
}

export type Task = {
  id: string
  utente_id: string
  nome: string | null
  cognome: string | null
  telefono: string | null
  lead_id: string | null
  prova_id: string | null
  tipo: TipoTask
  data: string | null
  nota: string | null
  assegnato_a: string | null
  assegnato_nome: string | null
  autore: string | null
  completato_il: string | null
  esito: 'positivo' | 'negativo' | null
  creato_il: string
  origine?: OrigineTask | null
}

// Da dove viene un task (crm.origine_task()): nessuna, se e' nato dalla scheda
// senza un lead, una prova, un rinnovo, una disdetta o un debito.
export type OrigineTask = 'lead' | 'prova' | 'rinnovo' | 'disdetta' | 'debito'

export type TipoTask = 'telefonata' | 'in_sede' | 'whatsapp' | 'email' | 'richiamare' | 'appuntamento'

export type Scheda = {
  persona: {
    id: string
    nome: string | null
    cognome: string | null
    email: string | null
    telefono: string | null
    telefono_norm: string | null
    member_id: number | null
    codice_fiscale: string | null
    data_nascita: string | null
    creato_il: string
  }
  socio: null | {
    numero: string | null
    tipo: string | null
    attivo: boolean | null
    creato_il: string | null
    saldo: number | null
    // Le date del certificato, dai custom attribute del socio ("AAAA-MM-GG").
    certificato?: { inizio: string | null; scadenza: string | null; temporaneo_inizio: string | null; temporaneo_fine: string | null } | null
    // Senza i certificati, che su PerfectGym sono contratti aggiuntivi.
    contratti: { id: number; piano: string | null; canone: number | null; stato: string | null; data_firma: string | null; data_inizio: string | null; data_fine: string | null; data_disdetta: string | null; aggiuntivo?: boolean; rinnovo_automatico?: boolean; giorno_addebito?: number | null }[]
    ingressi: { entrata: string; uscita: string | null }[]
    ingressi_30gg: number
    prenotazioni: { inizio: string; lezione: string | null; annullata: boolean | null; presente: boolean | null; in_attesa?: boolean | null }[]
  }
  lead: {
    id: string
    fonte: Fonte
    fonte_dettaglio: string | null
    attivita_interesse: string | null
    fase: Lead['fase']
    esito: Lead['esito']
    assegnato_a: string | null
    assegnato_nome: string | null
    creato_il: string
    chiuso_il: string | null
    note: string | null
    presentato_da: string | null
    orario_ricontatto: string | null
    origine?: string | null
    pgm_stato?: 'creato' | 'gia_su_pgm' | 'errore' | null
    pgm_lead_id?: number | null
    pgm_errore?: string | null
    consenso_privacy?: boolean | null
  }[]
  // automatico: l'esito l'ha messo il mirror (20260929u); abbonamento: quello
  // che l'ha chiusa come iscritto.
  prove: {
    id: string; tipo_pass: string | null; data_inizio: string | null; data_fine: string | null; esito: Prova['esito']
    obiezione: string | null; gestito_nome: string | null; gestito_da?: string | null; note: string | null
    automatico?: boolean; abbonamento?: { piano: string; dal: string } | null
  }[]
  nuovi_contratti: { contract_id: number; controllo: NuovoContratto['controllo']; tesseramento: string | null; numero_tessera: string | null; note: string | null; creato_il: string }[]
  disdette: { id: string; contract_id: number | null; data_disdetta: string | null; esito: Disdetta['esito']; motivo: string | null; contatto: string | null; note: string | null; gestito_da?: string | null; gestito_nome?: string | null; piano?: string | null }[]
  rinnovi?: { id: string; contract_id: number | null; piano: string | null; scadenza: string | null; esito: Rinnovo['esito']; assegnato_a: string | null; assegnato_nome: string | null; note: string | null }[]
  storia: (
    | { tipo: 'commento'; id: string; quando: string; testo: string; autore: string | null }
    | { tipo: 'task'; id: string; quando: string; task_tipo: TipoTask; data: string | null; nota: string | null; completato_il: string | null; esito: Task['esito']; archiviato?: boolean; nota_esito?: string | null; assegnato_nome: string | null; autore: string | null; origine?: OrigineTask | null }
  )[]
}

// I rinnovi: gli abbonamenti in scadenza da rinnovare, dall'Airtable dello
// staff (supabase/migrations/20260929b_airtable_sync_continuo.sql).
export type Rinnovo = {
  id: string
  utente_id: string | null
  nome: string | null
  cognome: string | null
  telefono: string | null
  email: string | null
  member_id: number | null
  contract_id: number | null
  piano: string | null
  scadenza: string | null
  valore: number | null
  stato_contratto: string | null
  rinnovato_su_pgm: boolean
  esito: 'rinnovato' | 'non_rinnovato' | null
  assegnato_a: string | null
  assegnato_nome: string | null
  gestito_il: string | null
  note: string | null
  task_aperti: number
  creato_il: string
}

// I debitori: il saldo e' quello del mirror di PerfectGym, letto adesso
// (supabase/migrations/20260929a_debitori.sql).
export type Debitore = {
  member_id: number
  debito_id: string | null
  utente_id: string | null
  nome: string | null
  cognome: string | null
  telefono: string | null
  email: string | null
  saldo: number | null
  negativo_da: string | null
  abbonamento_attivo: boolean
  piano: string | null
  stato_contratto: string | null
  data_fine: string | null
  ultimo_pagamento: string | null
  ultimo_importo: number | null
  assegnato_a: string | null
  assegnato_nome: string | null
  task_aperti: number
  prossimo_task: string | null
  note_task: string | null
  rientrato_il: string | null
  saldo_controllato_il: string | null
}

export type Trovato = {
  id: string
  nome: string | null
  cognome: string | null
  email: string | null
  telefono: string | null
  member_id: number | null
  lead_aperti: number
  ultima_attivita: string | null
}

// La dashboard abbonamenti (supabase/migrations/20260928p_dashboard_abbonamenti.sql).
export type Abbonamenti = {
  oggi: string
  aggiornato_il: string | null
  kpi: Record<'oggi' | 'anno_fa' | 'due_anni_fa', { giorno: string; abbonamenti: number; pass: number; old: number }>
  // La retention su base annuale (20260929s, 20260929t): degli iscritti del
  // mese, quanti lo erano anche un anno prima, senza interruzioni.
  retention?: {
    mese: string
    in_corso: boolean
    giorno: string
    giorno_anno_prima: string
    iscritti: number
    anno_prima: number
    da_un_anno: number
  }[]
  mesi: {
    mese: string
    in_corso: boolean
    attivi: number
    nuovi: number
    rinnovi: number
    scaduti: number
    scaduti_provvisori: number
    // Le prove: persone, non pass (chi ne attiva piu' d'uno conta una volta).
    prove: number
    prove_abbonati: number
    prove_provvisori: number
    prove_giorni: number | null
    prove_guest: number
    prove_guest_abbonati: number
    prove_piu_pass: number
    prove_pass: number
  }[]
  durata: {
    trimestri: (DurataPeriodo & { trimestre: string; vincolo: Vincolo; in_corso: boolean })[]
    riepilogo: {
      vincolo: Vincolo
      attivi: number
      attivi_oltre: number
      attivi_oltre_mesi: number | null
      periodi: Record<'ultimi_12' | 'precedenti_12', DurataPeriodo>
    }[]
  }
}
export type Vincolo = 1 | 4 | 12
export type DurataPeriodo = {
  disdetti: number
  durata_media: number | null
  arrivati: number
  oltre_medio: number | null
  anticipati: number
  con_cambio: number
}

// I ticket (supabase/migrations/20260930b_ticket.sql).
export type TipoTicket = 'guasto' | 'domanda' | 'attivita' | 'proposta' | 'modifica'
export type StatoTicket =
  | 'da_verificare' | 'inviato' | 'in_lavorazione' | 'in_attesa' | 'risolto' | 'risolto_desk' | 'doppione'
  | 'da_confermare' | 'confermata' | 'rilasciata' | 'annullata'

export type TicketRiga = {
  id: number
  tipo: TipoTicket
  stato: StatoTicket
  titolo: string
  bloccante: boolean
  utente_id: string | null
  nome: string | null
  cognome: string | null
  member_id: number | null
  aperto_da_nome: string | null
  aperto_il: string
  preso_nome: string | null
  aggiornato_il: string
  chiuso_il: string | null
  natura: string | null
  dal: string | null
  riunione: string | null
  doppione_di: number | null
  messaggi: number
  allegati: number
  ultimo_lato: 'passion' | 'r2d' | null
}

// La situazione del socio al momento dell'apertura (crm.ticket_contesto()).
export type ContestoTicket = {
  socio: boolean
  fotografata_il: string
  numero?: string | null
  saldo?: number | null
  certificato?: { inizio: string | null; scadenza: string | null; temporaneo_inizio: string | null; temporaneo_fine: string | null } | null
  abbonamenti?: { piano: string | null; stato: string | null; data_inizio: string | null; data_fine: string | null; data_disdetta: string | null }[]
  ingressi_30gg?: number | null
  ultimo_ingresso?: string | null
  prenotazioni?: { inizio: string; lezione: string | null; annullata: boolean | null; presente: boolean | null }[]
}

export type Ticket = {
  id: number
  tipo: TipoTicket
  stato: StatoTicket
  titolo: string
  descrizione: string
  utente_id: string | null
  contesto: ContestoTicket | null
  verifiche: string[]
  bloccante: boolean
  aperto_da: string
  aperto_da_nome: string | null
  aperto_da_lato: 'passion' | 'r2d'
  aperto_il: string
  inviato_nome: string | null
  inviato_il: string | null
  preso_da: string | null
  preso_nome: string | null
  preso_il: string | null
  chiuso_nome: string | null
  chiuso_il: string | null
  doppione_di: number | null
  natura: string | null
  causa: string | null
  soluzione: string | null
  abbonamenti: string | null
  dal: string | null
  comunicazione: string | null
  riunione: string | null
  confermata_nome: string | null
  confermata_il: string | null
  confermata_nota: string | null
  aggiornato_il: string
  persona: { id: string; nome: string | null; cognome: string | null; member_id: number | null; telefono: string | null; email: string | null } | null
  messaggi: { id: number; testo: string | null; evento: string | null; lato: 'passion' | 'r2d'; autore: string | null; creato_il: string }[]
  allegati: { id: number; percorso: string; nome: string; tipo: string | null; dimensione: number | null; messaggio_id: number | null; caricato_nome: string | null; caricato_il: string }[]
  doppioni: { id: number; titolo: string; aperto_da_nome: string | null; aperto_il: string }[]
  stessa_persona: { id: number; titolo: string; stato: StatoTicket }[]
}

export type TicketConti = {
  da_verificare: number
  proposte: number
  r2d: number
  in_attesa: number
  bloccanti: number
  miei: number
  modifiche_da_confermare: number
  modifiche_da_rilasciare: number
}

export type ResocontoMese = {
  mese: string
  aperti: number
  per_tipo: Record<string, number>
  chiusi: number
  per_natura: Record<string, number>
  al_desk: number
  doppioni: number
  modifiche_rilasciate: number
  ore_mediane: number | null
}

export const crm = {
  // Una volta per richiesta: la chiedono il layout e la pagina.
  io: cache(() => rpc<Io>('crm_io')),
  staff: () => rpc<Operatore[]>('crm_staff'),
  home: () => rpc<Home>('crm_home'),
  lead: (vista: string, fonte: string | null, testo: string | null, consulente: string | null = null) =>
    rpc<Lead[]>('crm_lead', { p_vista: vista, p_fonte: fonte, p_testo: testo, p_consulente: consulente }),
  prove: (vista: string, consulente: string | null = null) => rpc<Prova[]>('crm_prove', { p_vista: vista, p_consulente: consulente }),
  nuoviContratti: (vista: string) => rpc<NuovoContratto[]>('crm_nuovi_contratti', { p_vista: vista }),
  disdette: (vista: string, consulente: string | null = null) =>
    rpc<Disdetta[]>('crm_disdette', { p_vista: vista, p_consulente: consulente }),
  task: (chi: string, quando: string, consulente: string | null = null) =>
    rpc<Task[]>('crm_task', { p_chi: chi, p_quando: quando, p_consulente: consulente }),
  persona: (id: string) => rpc<Scheda | null>('crm_persona', { p_id: id }),
  cerca: (testo: string) => rpc<Trovato[]>('crm_cerca', { p_testo: testo }),
  rinnovi: (vista: string, consulente: string | null = null) =>
    rpc<Rinnovo[]>('crm_rinnovi', { p_vista: vista, p_consulente: consulente }),
  debitori: (vista: string, chi: string, consulente: string | null = null) =>
    rpc<Debitore[]>('crm_debitori', { p_vista: vista, p_chi: chi, p_consulente: consulente }),
  abbonamenti: () => rpc<Abbonamenti>('crm_abbonamenti'),
  utenti: () => rpc<Utente[]>('crm_utenti'),
  ticketElenco: (vista: string, utente: string | null = null) =>
    rpc<TicketRiga[]>('crm_ticket_elenco', { p_vista: vista, p_utente: utente }),
  ticket: (id: number) => rpc<Ticket | null>('crm_ticket', { p_id: id }),
  ticketConti: () => rpc<TicketConti>('crm_ticket_conti'),
  ticketResoconto: (mesi = 6) => rpc<ResocontoMese[]>('crm_ticket_resoconto', { p_mesi: mesi }),
}

// In cima a ogni pagina di una sezione: chi non la vede torna alla home.
// Il database fa lo stesso controllo sulle sue funzioni riservate.
export async function richiediSezione(sezione: Sezione) {
  const io = await crm.io()
  if (!puoVedere(io, sezione)) redirect(`/dashboard?errore=${encodeURIComponent('Questa sezione non è abilitata per te.')}`)
  return io
}

// Il socio su PerfectGym, per aprirlo nel gestionale.
export const linkPgm = (memberId: number | null | undefined) =>
  memberId ? `https://passion.perfectgym.com/Pgm/#/Users/${memberId}/UserContracts/UserActiveContracts` : null
