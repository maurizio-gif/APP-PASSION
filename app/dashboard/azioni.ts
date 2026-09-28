'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { rpc } from '@/lib/crm'
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
    })
    id = lead
  } catch (e) {
    redirect(`/dashboard/lead/nuovo?errore=${encodeURIComponent(e instanceof Error ? e.message : 'Non salvato')}`)
  }
  revalidatePath('/dashboard', 'layout')
  // La scheda della persona: la si apre subito per il primo commento o task.
  const u = id ? await rpc<string | null>('crm_utente_del_lead', { p_lead: id }) : null
  redirect(u ? `/dashboard/persone/${u}?ok=lead` : '/dashboard/lead')
}

// --- Commenti e task --------------------------------------------------------

export async function aggiungiCommento(f: FormData) {
  await esegui(f, () => rpc('crm_commento', { p_utente: testo(f, 'utente'), p_testo: testo(f, 'testo'), p_lead: testo(f, 'lead') }))
}

export async function nuovoTask(f: FormData) {
  await esegui(f, () =>
    rpc('crm_task_nuovo', {
      p_utente: testo(f, 'utente'), p_tipo: testo(f, 'tipo') ?? 'telefonata',
      p_data: daInputDataOra(testo(f, 'data')), p_nota: testo(f, 'nota'),
      p_assegnato: testo(f, 'assegnato'), p_lead: testo(f, 'lead'),
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
      p_note: testo(f, 'note'), p_gestisco: f.get('gestisco') === 'on',
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
      p_motivo: testo(f, 'motivo'), p_note: testo(f, 'note'),
    }))
}

// --- Ricerca ------------------------------------------------------------------

export async function cerca(f: FormData) {
  const q = testo(f, 'q')
  redirect(q ? `/dashboard/cerca?q=${encodeURIComponent(q)}` : '/dashboard/cerca')
}
