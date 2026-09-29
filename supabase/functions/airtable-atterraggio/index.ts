// Il punto d'arrivo dell'import da Airtable.
//
//   POST { "tabella": "Lista Opportunità", "record": [ { "id": "rec...", "createdTime": "...", ... } ] }
//   header x-import-token: <token del Vault airtable_import_token>
//
// Lo chiama il workflow n8n «PASSION: Airtable -> Supabase (import CRM)», una
// pagina per volta. I record finiscono interi in `airtable.record` con
// `airtable.salva()`; il CRM si costruisce da li' in SQL.
//
// Il token e' l'unica protezione, per questo `verify_jwt` e' spento.
//
// Una connessione per chiamata, chiusa alla fine. Il primo import (28/09/2026)
// teneva un pool aperto per ogni istanza calda: con centinaia di pagine in fila
// le istanze si moltiplicano, e le connessioni hanno esaurito gli slot del
// database, lasciando senza connessione anche il sync di PerfectGym.

import postgres from 'npm:postgres@3.4.5'

const DB_URL = Deno.env.get('SUPABASE_DB_URL')!

const TABELLE = new Set([
  'Mega Lista Centrale', 'Lista Opportunità', 'Commerciali', 'Task', 'Commenti',
  'PASS', 'DISDETTE PGM', 'NUOVI CONTRATTI', 'CAMBI ABBONAMENTO',
])

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Solo POST', { status: 405 })
  const sql = postgres(DB_URL, { prepare: false, max: 1, idle_timeout: 1, connect_timeout: 10 })
  try {
    return await gestisci(req, sql)
  } finally {
    await sql.end({ timeout: 2 })
  }
})

async function gestisci(req: Request, sql: ReturnType<typeof postgres>): Promise<Response> {
  const token = req.headers.get('x-import-token')
  const [r] = await sql`select decrypted_secret from vault.decrypted_secrets where name = 'airtable_import_token'`
  if (!token || !r || token !== r.decrypted_secret) {
    // Per capire quale token arriva senza mai mostrarlo: lunghezza e inizio
    // della sua impronta sha256 (confrontabili con quelle dei segreti del Vault).
    const [d] = token
      ? await sql`select length(${token}) as l, left(encode(extensions.digest(${token}, 'sha256'), 'hex'), 8) as h`
      : [{ l: 0, h: '-' }]
    console.log(`token rifiutato: ${d.l} caratteri, impronta ${d.h}`)
    return new Response(`Non autorizzato: token ricevuto di ${d.l} caratteri (impronta ${d.h})`, { status: 401 })
  }

  const corpo = await req.json().catch(() => null) as { tabella?: string; record?: unknown[] } | null
  if (!corpo?.tabella || !TABELLE.has(corpo.tabella) || !Array.isArray(corpo.record)) {
    return Response.json({ errore: 'Serve { tabella, record: [...] } con una tabella della base CRM PASSION FITNESS' }, { status: 400 })
  }
  try {
    const [s] = await sql`select airtable.salva(${corpo.tabella}, ${sql.json(corpo.record)}) as righe`
    return Response.json({ tabella: corpo.tabella, ricevuti: corpo.record.length, salvati: s.righe })
  } catch (e) {
    const messaggio = String(e instanceof Error ? e.message : e).slice(0, 500)
    await sql`insert into airtable.import_log (tabella, righe, errore) values (${corpo.tabella}, 0, ${messaggio})`
    return Response.json({ errore: messaggio }, { status: 500 })
  }
}
