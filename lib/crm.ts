import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'

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

export type Io = { id: string; email: string; nome: string; cognome: string | null; ruolo: 'admin' | 'consulente' } | null
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
}

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
    contratti: { id: number; piano: string | null; canone: number | null; stato: string | null; data_firma: string | null; data_inizio: string | null; data_fine: string | null; data_disdetta: string | null }[]
    ingressi: { entrata: string; uscita: string | null }[]
    ingressi_30gg: number
    prenotazioni: { inizio: string; lezione: string | null; annullata: boolean | null; presente: boolean | null }[]
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
  }[]
  prove: { id: string; tipo_pass: string | null; data_inizio: string | null; data_fine: string | null; esito: Prova['esito']; obiezione: string | null; gestito_nome: string | null; note: string | null }[]
  nuovi_contratti: { contract_id: number; controllo: NuovoContratto['controllo']; tesseramento: string | null; numero_tessera: string | null; note: string | null; creato_il: string }[]
  disdette: { id: string; contract_id: number | null; data_disdetta: string | null; esito: Disdetta['esito']; motivo: string | null; contatto: string | null; note: string | null }[]
  storia: (
    | { tipo: 'commento'; id: string; quando: string; testo: string; autore: string | null }
    | { tipo: 'task'; id: string; quando: string; task_tipo: TipoTask; data: string | null; nota: string | null; completato_il: string | null; esito: Task['esito']; archiviato?: boolean; assegnato_nome: string | null; autore: string | null }
  )[]
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

export const crm = {
  io: () => rpc<Io>('crm_io'),
  staff: () => rpc<Operatore[]>('crm_staff'),
  home: () => rpc<Home>('crm_home'),
  lead: (vista: string, fonte: string | null, testo: string | null) =>
    rpc<Lead[]>('crm_lead', { p_vista: vista, p_fonte: fonte, p_testo: testo }),
  prove: (vista: string) => rpc<Prova[]>('crm_prove', { p_vista: vista }),
  nuoviContratti: (vista: string) => rpc<NuovoContratto[]>('crm_nuovi_contratti', { p_vista: vista }),
  disdette: (vista: string) => rpc<Disdetta[]>('crm_disdette', { p_vista: vista }),
  task: (chi: string, quando: string) => rpc<Task[]>('crm_task', { p_chi: chi, p_quando: quando }),
  persona: (id: string) => rpc<Scheda | null>('crm_persona', { p_id: id }),
  cerca: (testo: string) => rpc<Trovato[]>('crm_cerca', { p_testo: testo }),
}

// Il socio su PerfectGym, per aprirlo nel gestionale.
export const linkPgm = (memberId: number | null | undefined) =>
  memberId ? `https://passion.perfectgym.com/Pgm/#/Users/${memberId}/UserContracts/UserActiveContracts` : null
