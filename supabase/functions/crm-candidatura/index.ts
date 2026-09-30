// «Inviaci il tuo CV»: le candidature del sito, dritte nel CRM.
//
//   POST multipart/form-data
//     nome, cognome, email, telefono (+39...), data_nascita (AAAA-MM-GG),
//     posizione (istruttore_fitness | istruttore_sala_pesi | receptionist),
//     privacy ("1"), file (JPEG, DNG, PDF, DOC, DOCX; max 10 MB),
//     sito_web (trappola per i robot: deve restare vuoto)
//
// La chiama il modulo di passionfitness.it/lavora-con-noi/, dal browser di chi
// si candida: per questo `verify_jwt` e' spento (deploy con --no-verify-jwt) e
// non c'e' nessun token da nascondere. Le difese sono altre:
//   - tutti i campi si ricontrollano qui, e il file si riconosce dai primi byte;
//   - la trappola `sito_web`: se compilata si risponde "ok" e non si salva nulla;
//   - al massimo 5 invii all'ora dalla stessa rete e 3 al giorno per email
//     (`crm.candidatura_limite`), prima di toccare Storage;
//   - CORS solo per il sito.
// Il file va nel bucket privato `curriculum`, le risposte in `public.candidature`
// (migrazione 20260930k). Se la riga non si scrive, il file si toglie.

import postgres from 'npm:postgres@3.4.5'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { estensioneDi, firmaCorretta, MAX_BYTE, nomeSicuro, TIPI, validaDati } from '../_shared/candidatura.ts'

const DB_URL = Deno.env.get('SUPABASE_DB_URL')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!

// Da dove puo' arrivare il modulo: il sito (con e senza www) e il dev locale.
const ORIGINI = new Set([
  'https://www.passionfitness.it',
  'https://passionfitness.it',
  'http://localhost:4321',
  'http://127.0.0.1:4321',
])

function chiaveDiServizio(): string {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (legacy) return legacy
  try {
    const mappa = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}')
    const prima = Object.values(mappa).find((v) => typeof v === 'string')
    if (prima) return prima as string
  } catch {
    // variabile assente o non JSON
  }
  throw new Error('Nessuna chiave di servizio disponibile')
}

async function impronta(testo: string): Promise<string> {
  const byte = new TextEncoder().encode(`passion-cv|${testo}`)
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', byte))
  return Array.from(hash, (b) => b.toString(16).padStart(2, '0')).join('')
}

// Le email (notifica a Marco e conferma al candidato) le manda la Vercel Function
// del sito con SendGrid: le chiavi stanno li'. Il segreto e' lo stesso nei due
// posti (CANDIDATURE_SEGRETO). Se manca o la chiamata fallisce si scrive solo
// nel log: la candidatura c'e' comunque, e sta nella sezione Curriculum.
async function avvisa(dati: Record<string, unknown>) {
  const segreto = Deno.env.get('CANDIDATURE_SEGRETO')
  if (!segreto) {
    console.error('crm-candidatura: CANDIDATURE_SEGRETO mancante, email non inviate')
    return
  }
  try {
    const url = Deno.env.get('NOTIFICA_URL') ?? 'https://www.passionfitness.it/api/notifica-candidatura'
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-segreto': segreto },
      body: JSON.stringify({
        nome: dati.nome,
        cognome: dati.cognome,
        email: dati.email,
        telefono: dati.telefono,
        posizione: dati.posizione,
      }),
      signal: AbortSignal.timeout(8000),
    })
    if (!r.ok) console.error('crm-candidatura: email', r.status, (await r.text()).slice(0, 200))
  } catch (e) {
    console.error('crm-candidatura: email', e instanceof Error ? e.message : e)
  }
}

function risposta(corpo: Record<string, unknown>, stato: number, origine: string | null) {
  const intestazioni: Record<string, string> = { 'Cache-Control': 'no-store' }
  if (origine && ORIGINI.has(origine)) {
    intestazioni['Access-Control-Allow-Origin'] = origine
    intestazioni['Vary'] = 'Origin'
  }
  return Response.json(corpo, { status: stato, headers: intestazioni })
}

Deno.serve(async (req) => {
  const origine = req.headers.get('origin')

  if (req.method === 'OPTIONS') {
    if (!origine || !ORIGINI.has(origine)) return new Response(null, { status: 403 })
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origine,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'content-type',
        'Access-Control-Max-Age': '86400',
        Vary: 'Origin',
      },
    })
  }
  if (req.method !== 'POST') return risposta({ errore: 'Solo POST' }, 405, origine)
  if (origine && !ORIGINI.has(origine)) return risposta({ errore: 'Origine non consentita' }, 403, origine)

  // Prima di leggere il corpo: un invio molto piu' grande del massimo non serve leggerlo.
  const dichiarata = Number(req.headers.get('content-length') ?? 0)
  if (dichiarata > MAX_BYTE + 512 * 1024) {
    return risposta({ errore: 'Il file è troppo grande: il massimo è 10 MB.' }, 413, origine)
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return risposta({ errore: 'Invio non valido. Riprova.' }, 400, origine)
  }

  // Trappola per i robot: una persona non vede questo campo.
  if (String(form.get('sito_web') ?? '').trim() !== '') return risposta({ ok: true }, 200, origine)

  const campi = Object.fromEntries(['nome', 'cognome', 'email', 'telefono', 'data_nascita', 'posizione'].map((k) => [k, form.get(k)]))
  const esito = validaDati(campi)
  if ('errore' in esito) return risposta({ errore: esito.errore }, 400, origine)
  const dati = esito.dati

  if (String(form.get('privacy') ?? '') !== '1') {
    return risposta({ errore: 'Serve aver letto l’informativa privacy per inviare la candidatura.' }, 400, origine)
  }

  const file = form.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return risposta({ errore: 'Allega il tuo curriculum.' }, 400, origine)
  }
  if (file.size > MAX_BYTE) return risposta({ errore: 'Il file è troppo grande: il massimo è 10 MB.' }, 413, origine)
  const estensione = estensioneDi(file.name)
  if (!(estensione in TIPI)) {
    return risposta({ errore: 'Formato non valido: allega un file JPEG, DNG, PDF o Word.' }, 400, origine)
  }
  const testa = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  if (!firmaCorretta(estensione, testa)) {
    return risposta({ errore: 'Il file non sembra un ' + estensione.toUpperCase() + ' valido. Controlla e riprova.' }, 400, origine)
  }

  const ip = (req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim()
  const ipHash = ip ? await impronta(ip) : null

  const sql = postgres(DB_URL, { prepare: false, max: 1, idle_timeout: 1, connect_timeout: 10 })
  let percorso: string | null = null
  const storage = createClient(SUPABASE_URL, chiaveDiServizio(), { auth: { persistSession: false } }).storage.from('curriculum')
  try {
    const [limite] = await sql`select crm.candidatura_limite(${ipHash}, ${dati.email}) as troppi`
    if (limite.troppi) {
      return risposta({ errore: 'Hai già inviato diverse candidature: aspetta un po’ prima di riprovare.' }, 429, origine)
    }

    percorso = `${new Date().getUTCFullYear()}/${crypto.randomUUID()}-${nomeSicuro(file.name)}`
    const tipo = TIPI[estensione]
    const { error } = await storage.upload(percorso, file, { contentType: tipo, upsert: false })
    if (error) {
      percorso = null
      console.error('crm-candidatura: upload', error.message)
      return risposta({ errore: 'Non siamo riusciti a salvare il file. Riprova tra poco.' }, 500, origine)
    }

    await sql`select crm.nuova_candidatura(${sql.json({
      ...dati,
      file_percorso: percorso,
      file_nome: file.name.slice(-120),
      file_tipo: tipo,
      file_dimensione: file.size,
      ip_hash: ipHash,
    })})`
    // La candidatura e' salvata: le email non devono poterla far fallire.
    await avvisa(dati)
    return risposta({ ok: true }, 200, origine)
  } catch (e) {
    console.error('crm-candidatura:', e instanceof Error ? e.message : e)
    // La riga non c'e': il file non deve restare orfano.
    if (percorso) await storage.remove([percorso]).catch(() => {})
    return risposta({ errore: 'Non siamo riusciti a registrare la candidatura. Riprova tra poco.' }, 500, origine)
  } finally {
    await sql.end({ timeout: 2 })
  }
})
