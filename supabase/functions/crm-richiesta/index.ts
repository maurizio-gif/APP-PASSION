// Le richieste dei moduli, dritte nel CRM.
//
//   POST { "tipo": "pass" | "referral" | "lead" | "tour", "rif": "<id esecuzione>",
//          "nome", "cognome", "email", "telefono", "attivita", "fonte",
//          "presentato_da", "orario_ricontatto" }
//   header x-import-token: <token del Vault airtable_import_token>
//
// La chiamano i workflow n8n della cartella PASSION/RICHIESTE (PROVA PASSION,
// REFERRAL PASSION), accanto alla scrittura su Airtable. Il lead lo crea
// `crm.nuova_richiesta()` (migrazione 20260928n), con le stesse regole
// dell'import da Airtable. Stesso token dell'import: una credenziale sola in n8n.
//
// Il token e' l'unica protezione, per questo `verify_jwt` e' spento. Una
// connessione per chiamata, chiusa alla fine (vedi airtable-atterraggio).

import postgres from 'npm:postgres@3.4.5'

const DB_URL = Deno.env.get('SUPABASE_DB_URL')!

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Solo POST', { status: 405 })
  const sql = postgres(DB_URL, { prepare: false, max: 1, idle_timeout: 1, connect_timeout: 10 })
  try {
    const token = req.headers.get('x-import-token')
    const [r] = await sql`select decrypted_secret from vault.decrypted_secrets where name = 'airtable_import_token'`
    if (!token || !r || token !== r.decrypted_secret) return new Response('Non autorizzato', { status: 401 })

    const corpo = await req.json().catch(() => null)
    if (!corpo || typeof corpo !== 'object' || Array.isArray(corpo)) {
      return Response.json({ errore: 'Serve un oggetto JSON con tipo, nome, cognome, email, telefono…' }, { status: 400 })
    }
    try {
      const [s] = await sql`select crm.nuova_richiesta(${sql.json(corpo)}) as lead`
      return Response.json({ lead: s.lead })
    } catch (e) {
      return Response.json({ errore: String(e instanceof Error ? e.message : e).slice(0, 500) }, { status: 400 })
    }
  } finally {
    await sql.end({ timeout: 2 })
  }
})
