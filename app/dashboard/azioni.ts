'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { edge, rpc } from '@/lib/crm'
import { daInputDataOra } from '@/lib/formato'

// Le azioni del CRM. Ognuna chiama la sua funzione crm_* del database, che
// controlla chi puo' fare cosa; qui si legge il modulo e si torna alla pagina
// da cui si e' partiti (campo nascosto `torna`), con l'errore se c'e'.

const testo = (f: FormData, k: string) => {
  const v = f.get(k)
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null
}

function torna(f: FormData) {
  const t = testo(f, 'torna')
  return t && t.startsWith('/dashboard') ? t : '/dashboard'
}

async function esegui(f: FormData, azione: () => Promise<unknown>, dopo?: string) {
  const destinazione = dopo ?? torna(f)
  try {
    await azione()
  } catch (e) {
    const messaggio = e instanceof Error ? e.message : 'Operazione non riuscita'
    const sep = destinazione.includes('?') ? '&' : '?'
    redirect(`${destinazione}${sep}errore=${encodeURIComponent(messaggio)}`)
  }
  revalidatePath('/dashboard', 'layout')
  redirect(destinazione)
}

// --- Lead -------------------------------------------------------------------

export async function prendiLead(f: FormData) {
  await esegui(f, () => rpc('crm_lead_prendi', { p_lead: testo(f, 'lead') }))
}

export async function assegnaLead(f: FormData) {
  await esegui(f, () => rpc('crm_lead_assegna', { p_lead: testo(f, 'lead'), p_staff: testo(f, 'staff') }))
}

// Toglierselo: il lead torna da gestire, senza nessuno (20260930e).
export async function rilasciaLead(f: FormData) {
  await esegui(f, () => rpc('crm_lead_rilascia', { p_lead: testo(f, 'lead') }))
}

export async function chiudiLead(f: FormData) {
  const scelta = testo(f, 'chiusura') // vinta_prova | vinta_contratto | persa
  const [fase, esito] = scelta === 'persa' ? ['persa', null] : ['vinta', scelta === 'vinta_contratto' ? 'contratto' : 'prova']
  await esegui(f, () => rpc('crm_lead_chiudi', { p_lead: testo(f, 'lead'), p_fase: fase, p_esito: esito, p_nota: testo(f, 'nota') }))
}

export async function riapriLead(f: FormData) {
  await esegui(f, () => rpc('crm_lead_riapri', { p_lead: testo(f, 'lead') }))
}

export async function nuovoLead(f: FormData) {
  let id: string | null = null
  try {
    const lead = await rpc<string>('crm_lead_nuovo', {
      p_nome: testo(f, 'nome'), p_cognome: testo(f, 'cognome'), p_telefono: testo(f, 'telefono'),
      p_email: testo(f, 'email'), p_fonte: testo(f, 'fonte'), p_fonte_dettaglio: testo(f, 'fonte_dettaglio'),
      p_attivita: testo(f, 'attivita'), p_nota: testo(f, 'nota'), p_prendo: f.get('prendo') === 'on',
      p_privacy: f.get('privacy') === 'on',
    })
    id = lead
  } catch (e) {
    redirect(`/dashboard/lead/nuovo?errore=${encodeURIComponent(e instanceof Error ? e.message : 'Non salvato')}`)
  }
  // Poi su PerfectGym, come fanno i form del sito in n8n. Se non va il lead
  // nel CRM resta: si dice perche' e dalla scheda si riprova.
  let esito = 'ok=lead'
  if (id) {
    try {
      const r = await edge<EsitoPerfectGym>('crm-perfectgym-lead', { lead: id })
      if (r.stato === 'gia_su_pgm') esito = 'ok=lead_gia_pgm'
      else if (r.stato === 'errore') esito = `errore=${encodeURIComponent(nonSuPgm(r.errore))}`
    } catch (e) {
      esito = `errore=${encodeURIComponent(nonSuPgm(e instanceof Error ? e.message : undefined))}`
    }
  }
  revalidatePath('/dashboard', 'layout')
  // La scheda della persona: la si apre subito per il primo commento o task.
  const u = id ? await rpc<string | null>('crm_utente_del_lead', { p_lead: id }) : null
  redirect(u ? `/dashboard/persone/${u}?${esito}` : '/dashboard/lead')
}

type EsitoPerfectGym = { stato: 'creato' | 'gia_su_pgm' | 'errore'; errore?: string }
const nonSuPgm = (motivo?: string) =>
  `Lead creato nel CRM, ma non su PerfectGym: ${motivo ?? 'errore sconosciuto'}. Correggi i dati se serve e riprova dalla scheda del lead.`

// Il bottone «Riprova» della scheda: di nuovo AddLead su PerfectGym.
export async function leadSuPerfectGym(f: FormData) {
  await esegui(f, async () => {
    const r = await edge<EsitoPerfectGym>('crm-perfectgym-lead', { lead: testo(f, 'lead') })
    if (r.stato === 'errore') throw new Error(`PerfectGym non ha creato il lead: ${r.errore ?? 'errore sconosciuto'}`)
  })
}

// --- Commenti e task --------------------------------------------------------

export async function aggiungiCommento(f: FormData) {
  await esegui(f, () => rpc('crm_commento', { p_utente: testo(f, 'utente'), p_testo: testo(f, 'testo'), p_lead: testo(f, 'lead') }))
}

// Programmato: la data scelta e le note di preparazione. Registrato: fatto
// adesso (la data la mette il database), con l'esito e le note dell'esito.
export async function nuovoTask(f: FormData) {
  // Per cosa e' il task: «lead:<id>», «prova:<id>», «rinnovo:<id>», «disdetta:<id>»,
  // o niente (solo la persona). Il database lo aggancia solo se e' della persona.
  const [cosa, id] = (testo(f, 'per') ?? '').split(':')
  const per = {
    p_lead: cosa === 'lead' ? id : null, p_prova: cosa === 'prova' ? id : null,
    p_rinnovo: cosa === 'rinnovo' ? id : null, p_disdetta: cosa === 'disdetta' ? id : null,
  }
  await esegui(f, () =>
    testo(f, 'modo') === 'registra'
      ? rpc('crm_task_registra', {
          p_utente: testo(f, 'utente'), p_tipo: testo(f, 'tipo') ?? 'telefonata',
          p_esito: testo(f, 'esito'), p_nota_esito: testo(f, 'nota'),
          p_assegnato: testo(f, 'assegnato'), ...per,
        })
      : rpc('crm_task_nuovo', {
          p_utente: testo(f, 'utente'), p_tipo: testo(f, 'tipo') ?? 'telefonata',
          p_data: daInputDataOra(testo(f, 'data')), p_nota: testo(f, 'nota'),
          p_assegnato: testo(f, 'assegnato'), ...per,
        }))
}

export async function completaTask(f: FormData) {
  await esegui(f, () => rpc('crm_task_completa', { p_task: testo(f, 'task'), p_esito: testo(f, 'esito'), p_nota: testo(f, 'nota') }))
}

// --- Prove, contratti, disdette ----------------------------------------------

export async function aggiornaProva(f: FormData) {
  await esegui(f, () =>
    rpc('crm_prova_aggiorna', {
      p_prova: testo(f, 'prova'), p_esito: testo(f, 'esito') ?? '', p_obiezione: testo(f, 'obiezione'),
      p_note: testo(f, 'note'), p_gestisco: f.get('gestisco') === 'on', p_assegnato: testo(f, 'assegnato'),
    }))
}

export async function aggiornaContratto(f: FormData) {
  await esegui(f, () =>
    rpc('crm_contratto_aggiorna', {
      p_contract: Number(testo(f, 'contratto')), p_metodo_pagamento_ok: f.get('metodo') === 'on',
      p_codice_fiscale_ok: f.get('cf') === 'on', p_tesseramento: testo(f, 'tesseramento') ?? '',
      p_numero_tessera: testo(f, 'numero_tessera'), p_errore_asi: testo(f, 'errore_asi'), p_fonte: testo(f, 'fonte'),
      p_referral: testo(f, 'referral'), p_note: testo(f, 'note'), p_controllo: testo(f, 'controllo') ?? 'da_controllare',
    }))
}

export async function aggiornaDisdetta(f: FormData) {
  await esegui(f, () =>
    rpc('crm_disdetta_aggiorna', {
      p_id: testo(f, 'disdetta'), p_esito: testo(f, 'esito') ?? '', p_contatto: testo(f, 'contatto') ?? '',
      p_motivo: testo(f, 'motivo'), p_note: testo(f, 'note'), p_assegnato: testo(f, 'assegnato'),
    }))
}

export async function aggiornaRinnovo(f: FormData) {
  await esegui(f, () =>
    rpc('crm_rinnovo_aggiorna', {
      p_id: testo(f, 'rinnovo'), p_esito: testo(f, 'esito') ?? '', p_assegnato: testo(f, 'assegnato'), p_note: testo(f, 'note'),
    }))
}

// --- Debitori ----------------------------------------------------------------

export async function debitoTask(f: FormData) {
  await esegui(f, () =>
    rpc('crm_debito_task', {
      p_member: Number(testo(f, 'socio')), p_tipo: testo(f, 'tipo') ?? 'telefonata',
      p_data: daInputDataOra(testo(f, 'data')), p_nota: testo(f, 'nota'), p_assegnato: testo(f, 'assegnato'),
    }))
}

export async function debitoAssegna(f: FormData) {
  await esegui(f, () => rpc('crm_debito_assegna', { p_member: Number(testo(f, 'socio')), p_staff: testo(f, 'staff') }))
}

// --- Ticket -------------------------------------------------------------------
// Le regole (chi invia, chi chiude, cosa serve per chiudere) le controlla il
// database: supabase/migrations/20260930b_ticket.sql.

const numero = (f: FormData, k: string) => {
  const v = Number(testo(f, k))
  return Number.isFinite(v) && v > 0 ? v : null
}

export async function nuovoTicket(f: FormData) {
  const persona = testo(f, 'persona')
  let id: number | null = null
  try {
    id = await rpc<number>('crm_ticket_nuovo', {
      p_tipo: testo(f, 'tipo'), p_titolo: testo(f, 'titolo'), p_descrizione: testo(f, 'descrizione'),
      p_utente: persona, p_verifiche: lista(f, 'verifiche'), p_bloccante: f.get('bloccante') === 'on',
    })
  } catch (e) {
    const messaggio = encodeURIComponent(e instanceof Error ? e.message : 'Non salvato')
    redirect(`/dashboard/ticket/nuovo?${persona ? `persona=${persona}&` : ''}errore=${messaggio}`)
  }
  revalidatePath('/dashboard', 'layout')
  redirect(`/dashboard/ticket/${id}?ok=ticket_aperto`)
}

export async function messaggioTicket(f: FormData) {
  await esegui(f, () => rpc('crm_ticket_messaggio', { p_id: numero(f, 'ticket'), p_testo: testo(f, 'testo') }))
}

export async function inviaTicket(f: FormData) {
  await esegui(f, () => rpc('crm_ticket_invia', { p_id: numero(f, 'ticket'), p_nota: testo(f, 'nota') }))
}

export async function risolviTicketDesk(f: FormData) {
  await esegui(f, () =>
    rpc('crm_ticket_risolvi_desk', { p_id: numero(f, 'ticket'), p_natura: testo(f, 'natura'), p_risposta: testo(f, 'risposta') }))
}

export async function unisciTicket(f: FormData) {
  await esegui(f, () => rpc('crm_ticket_unisci', { p_id: numero(f, 'ticket'), p_in: numero(f, 'in') }))
}

export async function riapriTicket(f: FormData) {
  await esegui(f, () => rpc('crm_ticket_riapri', { p_id: numero(f, 'ticket'), p_motivo: testo(f, 'motivo') }))
}

export async function prendiTicket(f: FormData) {
  await esegui(f, () => rpc('crm_ticket_prendi', { p_id: numero(f, 'ticket') }))
}

export async function chiediTicket(f: FormData) {
  await esegui(f, () => rpc('crm_ticket_chiedi', { p_id: numero(f, 'ticket'), p_domanda: testo(f, 'domanda') }))
}

export async function risolviTicket(f: FormData) {
  await esegui(f, () =>
    rpc('crm_ticket_risolvi', {
      p_id: numero(f, 'ticket'), p_natura: testo(f, 'natura'), p_causa: testo(f, 'causa'), p_soluzione: testo(f, 'soluzione'),
    }))
}

const campiModifica = (f: FormData) => ({
  p_titolo: testo(f, 'titolo'), p_descrizione: testo(f, 'descrizione'), p_abbonamenti: testo(f, 'abbonamenti'),
  p_dal: testo(f, 'dal'), p_comunicazione: testo(f, 'comunicazione'), p_riunione: testo(f, 'riunione'),
})

export async function nuovaModifica(f: FormData) {
  let id: number | null = null
  try {
    id = await rpc<number>('crm_modifica_nuova', campiModifica(f))
  } catch (e) {
    redirect(`/dashboard/ticket/modifica?errore=${encodeURIComponent(e instanceof Error ? e.message : 'Non salvata')}`)
  }
  revalidatePath('/dashboard', 'layout')
  redirect(`/dashboard/ticket/${id}?ok=modifica_scritta`)
}

export async function aggiornaModifica(f: FormData) {
  await esegui(f, () => rpc('crm_modifica_aggiorna', { p_id: numero(f, 'ticket'), ...campiModifica(f) }))
}

export async function confermaModifica(f: FormData) {
  await esegui(f, () => rpc('crm_modifica_conferma', { p_id: numero(f, 'ticket'), p_nota: testo(f, 'nota') }))
}

export async function rilasciaModifica(f: FormData) {
  await esegui(f, () => rpc('crm_modifica_rilascia', { p_id: numero(f, 'ticket'), p_verifica: testo(f, 'verifica') }))
}

export async function annullaModifica(f: FormData) {
  await esegui(f, () => rpc('crm_modifica_annulla', { p_id: numero(f, 'ticket'), p_motivo: testo(f, 'motivo') }))
}

// Gli allegati li carica il browser su Storage (bucket `ticket`, cartella del
// ticket): qui si registrano nel ticket. Chiamata da CaricaAllegati.
export type AllegatoCaricato = { percorso: string; nome: string; tipo: string | null; dimensione: number }

export async function registraAllegati(ticket: number, allegati: AllegatoCaricato[]): Promise<{ errore?: string }> {
  try {
    for (const a of allegati) {
      await rpc('crm_ticket_allegato', {
        p_id: ticket, p_percorso: a.percorso, p_nome: a.nome, p_tipo: a.tipo, p_dimensione: a.dimensione,
      })
    }
  } catch (e) {
    return { errore: e instanceof Error ? e.message : 'Allegati non registrati' }
  }
  revalidatePath(`/dashboard/ticket/${ticket}`)
  return {}
}

// --- Ricerca ------------------------------------------------------------------

export async function cerca(f: FormData) {
  const q = testo(f, 'q')
  redirect(q ? `/dashboard/cerca?q=${encodeURIComponent(q)}` : '/dashboard/cerca')
}

// --- Utenti -------------------------------------------------------------------

const lista = (f: FormData, k: string) => f.getAll(k).filter((v): v is string => typeof v === 'string' && v !== '')

// Si torna sempre a Utenti: con «Salvato» o con l'errore del database (che
// dice perche', per esempio che il proprio ruolo lo cambia un altro).
async function suUtenti(ok: string | (() => string), azione: () => Promise<unknown>) {
  try {
    await azione()
  } catch (e) {
    revalidatePath('/dashboard', 'layout')
    redirect(`/dashboard/utenti?errore=${encodeURIComponent(e instanceof Error ? e.message : 'Non salvato')}`)
  }
  revalidatePath('/dashboard', 'layout')
  redirect(`/dashboard/utenti?ok=${typeof ok === 'string' ? ok : ok()}`)
}

export async function aggiornaUtente(f: FormData) {
  await suUtenti('utente_salvato', () =>
    rpc('crm_utente_aggiorna', {
      p_id: testo(f, 'utente'),
      p_ruolo: testo(f, 'ruolo'),
      p_attivo: f.get('attivo') === 'on',
      p_sezioni: lista(f, 'sezioni'),
      p_autorizzazioni: lista(f, 'autorizzazioni'),
      p_assegnabile: f.get('assegnabile') === 'on',
    }),
  )
}

// L'invito (o, a chi l'accesso ce l'ha gia', il link per una nuova password):
// l'Edge Function crm-invito, con i permessi controllati dal database.
const invita = (utente: string | null) =>
  edge<{ inviato: 'invito' | 'password' }>('crm-invito', {
    utente,
    sito: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  })

// Si crea e si invita subito: se l'invito non parte l'utente resta creato, e
// lo si reinvita dalla sua scheda.
export async function nuovoUtente(f: FormData) {
  await suUtenti('utente_creato', async () => {
    const id = await rpc<string>('crm_utente_nuovo', {
      p_email: testo(f, 'email'),
      p_nome: testo(f, 'nome'),
      p_cognome: testo(f, 'cognome'),
      p_ruolo: testo(f, 'ruolo') ?? 'consulente',
    })
    await invita(id).catch((e) => {
      throw new Error(`Utente creato, ma l’invito non è partito: ${e instanceof Error ? e.message : e}`)
    })
  })
}

export async function invitaUtente(f: FormData) {
  let inviato = 'invito'
  await suUtenti(
    () => (inviato === 'password' ? 'utente_link_password' : 'utente_invitato'),
    async () => {
      inviato = (await invita(testo(f, 'utente'))).inviato
    },
  )
}

// Il lavoro aperto passa a chi si sceglie (vuoto: torna da assegnare). Senza
// storia nel CRM l'utente si cancella, altrimenti resta nella storia, rimosso.
export async function rimuoviUtente(f: FormData) {
  let esito = 'rimosso'
  await suUtenti(
    () => `utente_${esito}`,
    async () => {
      esito = await rpc<string>('crm_utente_rimuovi', { p_id: testo(f, 'utente'), p_passa_a: testo(f, 'passa_a') })
    },
  )
}
