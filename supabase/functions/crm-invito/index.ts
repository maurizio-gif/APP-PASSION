// L'invito nel CRM, o il link per una nuova password.
//
//   POST { "utente": "<id di public.staff>", "sito": "https://crm.passionfitness.it" }
//   header Authorization: Bearer <sessione di chi e' entrato nel CRM>
//
// La chiama la pagina Utenti. Chi puo' invitare chi lo decide il database
// (`crm_utente_email_invito`, migrazione 20260929f), chiamato con la sessione
// di chi chiama: se non puo', risponde con l'errore. Poi, con la chiave di
// servizio (che sta solo qui), si invita chi non ha ancora l'accesso e si
// manda il link per la password a chi ce l'ha. Il link porta a
// <sito>/auth/callback, che dev'essere fra i Redirect URLs di Supabase.

import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const URL = Deno.env.get('SUPABASE_URL')!
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVIZIO = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const risposta = (corpo: Record<string, unknown>, status = 200) => Response.json(corpo, { status, headers: cors })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return risposta({ errore: 'Solo POST' }, 405)

  const auth = req.headers.get('Authorization') ?? ''
  const corpo = await req.json().catch(() => null)
  const utente = typeof corpo?.utente === 'string' ? corpo.utente : null
  const sito = typeof corpo?.sito === 'string' && /^https?:\/\/[^/]+$/.test(corpo.sito) ? corpo.sito : null
  if (!utente || !sito) return risposta({ errore: 'Servono utente e sito' }, 400)

  const comeChiama = createClient(URL, ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } })
  const { data: email, error: negato } = await comeChiama.rpc('crm_utente_email_invito', { p_id: utente })
  if (negato || typeof email !== 'string') return risposta({ errore: negato?.message ?? 'Non autorizzato' }, 403)

  const servizio = createClient(URL, SERVIZIO, { auth: { persistSession: false } })
  const redirectTo = `${sito}/auth/callback`

  const { error: invito } = await servizio.auth.admin.inviteUserByEmail(email, { redirectTo })
  if (!invito) return risposta({ inviato: 'invito', email })

  // Ha gia' l'accesso: il link per una nuova password.
  if (invito.status === 422 || /already been registered|already exists/i.test(invito.message)) {
    const { error: recupero } = await servizio.auth.resetPasswordForEmail(email, { redirectTo })
    if (!recupero) return risposta({ inviato: 'password', email })
    return risposta({ errore: `Email non partita: ${recupero.message}` }, 502)
  }
  return risposta({ errore: `Email non partita: ${invito.message}` }, 502)
})
