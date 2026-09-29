// Il lead creato nel CRM, anche su PerfectGym.
//
//   POST { "lead": "<id di public.lead>" }
//   header Authorization: Bearer <sessione di chi e' entrato nel CRM>
//
// La chiama «Nuovo lead» subito dopo aver creato il lead, e il bottone
// «Riprova» della scheda persona se non era andata. La stessa chiamata dei
// workflow n8n del sito (passion-prova-compilata, passion-referral):
// Crm2/AddLead con club 1, sourceId 12, campaignId 12, inquiredViaId 79 e
// l'agreement 3, cosi' i lead del desk entrano su PerfectGym come gli altri.
// L'agreement e' accettato solo se chi ha creato il lead ha spuntato il
// consenso privacy (`lead.consenso_privacy`, migrazione 20260929p).
//
// Chi puo' e quali dati mandare lo dice il database (`crm_lead_perfectgym`,
// migrazione 20260929o), chiamato con la sessione di chi chiama. L'esito
// (`lead.pgm_*`) lo scrive questa funzione con la chiave di servizio. Se la
// persona e' gia' su PerfectGym (ha un member_id) non si crea niente: sarebbe
// un doppione.

import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const URL_SUPABASE = Deno.env.get('SUPABASE_URL')!
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVIZIO = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const BASE = Deno.env.get('PERFECTGYM_URL') ?? 'https://passion.perfectgym.com/Api/v2.2'
const CLIENT_ID = Deno.env.get('PERFECTGYM_CLIENT_ID') ?? ''
const CLIENT_SECRET = Deno.env.get('PERFECTGYM_CLIENT_SECRET') ?? ''
// AddLead sta nella v2.1, il resto (sync) nella v2.2.
const ADD_LEAD = `${new URL(BASE).origin}/Api/v2.1/Crm2/AddLead`

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const risposta = (corpo: Record<string, unknown>, status = 200) => Response.json(corpo, { status, headers: cors })

// Come «Normalizza Lead» in n8n: via spazi e simboli, +39 se manca il prefisso.
function cellulare(t: unknown): string {
  let c = String(t ?? '').replace(/[\s.\-()\/]/g, '')
  if (c && !c.startsWith('+')) c = '+39' + c.replace(/^0039/, '').replace(/^39(?=3)/, '')
  return c
}

// Il motivo del rifiuto, dove PerfectGym lo mette (es. PhoneNumberInvalid).
function motivo(testo: string, status: number): string {
  try {
    const j = JSON.parse(testo)
    const m = j?.message ?? j?.errors?.[0]?.message ?? j?.error?.message ?? j?.errors?.[0]?.code
    if (m) return String(m)
  } catch { /* non JSON */ }
  const m = testo.match(/"message"\s*:\s*"([^"]+)"/)
  return m ? m[1] : `HTTP ${status}${testo ? `: ${testo.slice(0, 200)}` : ''}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return risposta({ errore: 'Solo POST' }, 405)

  const auth = req.headers.get('Authorization') ?? ''
  const corpo = await req.json().catch(() => null)
  const lead = typeof corpo?.lead === 'string' ? corpo.lead : null
  if (!lead) return risposta({ errore: 'Serve il lead' }, 400)

  const comeChiama = createClient(URL_SUPABASE, ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } })
  const { data: p, error: negato } = await comeChiama.rpc('crm_lead_perfectgym', { p_lead: lead })
  if (negato || !p) return risposta({ errore: negato?.message ?? 'Non autorizzato' }, 403)

  const servizio = createClient(URL_SUPABASE, SERVIZIO, { auth: { persistSession: false } })
  const segna = async (stato: 'creato' | 'gia_su_pgm' | 'errore', leadId: number | null, errore: string | null) => {
    await servizio.from('lead')
      .update({ pgm_stato: stato, pgm_lead_id: leadId, pgm_errore: errore, pgm_inviato_il: new Date().toISOString() })
      .eq('id', lead)
  }

  if (p.member_id) {
    await segna('gia_su_pgm', null, null)
    return risposta({ stato: 'gia_su_pgm' })
  }

  const telefono = cellulare(p.telefono)
  const dati: Record<string, unknown> = {
    firstName: String(p.nome ?? '').trim(),
    lastName: String(p.cognome ?? '').trim(),
    email: String(p.email ?? '').trim().toLowerCase(),
    clubId: 1, sourceId: 12, campaignId: 12, inquiredViaId: 79,
    agreements: [{ id: 3, hasAgreed: p.consenso_privacy === true }],
  }
  if (telefono) dati.phone = telefono

  let errore: string
  try {
    const r = await fetch(ADD_LEAD, {
      method: 'POST',
      headers: { 'X-Client-Id': CLIENT_ID, 'X-Client-Secret': CLIENT_SECRET, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(dati),
      signal: AbortSignal.timeout(15000),
    })
    const testo = await r.text()
    const leadId = (() => { try { return Number(JSON.parse(testo)?.leadId) || null } catch { return null } })()
    if (r.ok && leadId) {
      await segna('creato', leadId, null)
      return risposta({ stato: 'creato', leadId })
    }
    errore = motivo(testo, r.status)
  } catch (e) {
    errore = `PerfectGym non risponde: ${e instanceof Error ? e.message : e}`
  }
  errore = errore.slice(0, 500)
  await segna('errore', null, errore)
  return risposta({ stato: 'errore', errore })
})
