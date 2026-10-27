// Le presenze segnate nel CRM, anche su PerfectGym.
//
//   POST {}                       (con la chiave di servizio, a mano o da pg_cron)
//
// SCRITTA MA NON ACCESA. Finche' `crm.impostazioni.presenze_su_perfectgym` non
// e' «si» la funzione non fa niente (risponde `{ acceso: false }`): le presenze
// restano nel CRM (`public.appello_presenze`) e non vanno a PerfectGym. Per
// accenderla: prima si prova su UNA prenotazione (chiamata a mano con il body
// `{ "prova": <booking_id> }`, che manda solo quella), si guarda su PerfectGym, poi
// si imposta «si» e si programma pg_cron ogni minuto (come perfectgym-sync).
//
// A ogni chiamata prende le presenze con `inviato_pg_il` vuoto (le piu' vecchie
// prima, fino a 100) e per ciascuna chiama
//
//   POST /v2.2/ClassBooking/SetMembersPresenceOnClass  { bookingId, isPresent }
//
// Se va bene scrive `inviato_pg_il`; se PerfectGym rifiuta (499: prenotazione non
// trovata, lezione chiusa...) scrive il motivo in `errore_pg` e conta il
// tentativo. Dopo 5 tentativi la riga resta li, con l'errore, per essere
// guardata a mano. Segnare di nuovo la stessa prenotazione dal CRM azzera
// l'errore e i tentativi.

import postgres from 'npm:postgres@3.4.5'
import { soloServizio } from '../_shared/solo-servizio.ts'

const BASE = Deno.env.get('PERFECTGYM_URL') ?? 'https://passion.perfectgym.com/Api/v2.2'
const CLIENT_ID = Deno.env.get('PERFECTGYM_CLIENT_ID') ?? ''
const CLIENT_SECRET = Deno.env.get('PERFECTGYM_CLIENT_SECRET') ?? ''
const TENTATIVI_MASSIMI = 5

const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { prepare: false, max: 2 })

function motivo(testo: string, status: number): string {
  try {
    const j = JSON.parse(testo)
    const m = j?.errors?.[0]?.message ?? j?.message ?? j?.errors?.[0]?.code
    if (m) return String(m)
  } catch { /* non JSON */ }
  return `HTTP ${status}${testo ? `: ${testo.slice(0, 200)}` : ''}`
}

async function invia(bookingId: number, presente: boolean): Promise<string | null> {
  try {
    const r = await fetch(`${BASE}/ClassBooking/SetMembersPresenceOnClass`, {
      method: 'POST',
      headers: { 'X-Client-Id': CLIENT_ID, 'X-Client-Secret': CLIENT_SECRET, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ bookingId, isPresent: presente }),
      signal: AbortSignal.timeout(15000),
    })
    if (r.ok) return null
    return motivo(await r.text(), r.status)
  } catch (e) {
    return `PerfectGym non risponde: ${e instanceof Error ? e.message : e}`
  }
}

Deno.serve(async (req) => {
  if (!soloServizio(req)) return new Response('Non autorizzato', { status: 401 })
  if (!CLIENT_ID || !CLIENT_SECRET) return Response.json({ errore: 'Mancano i secret PERFECTGYM_CLIENT_ID / PERFECTGYM_CLIENT_SECRET' }, { status: 500 })

  const corpo = await req.json().catch(() => ({})) as { prova?: number }
  const [{ valore }] = await sql`select valore from crm.impostazioni where chiave = 'presenze_su_perfectgym'`
  // La prova su una sola prenotazione si puo' fare anche con la funzione spenta.
  if (valore !== 'si' && !corpo.prova) return Response.json({ acceso: false })

  const righe = corpo.prova
    ? await sql`select booking_id, presente from public.appello_presenze where booking_id = ${corpo.prova}`
    : await sql`select booking_id, presente from public.appello_presenze
                 where inviato_pg_il is null and tentativi < ${TENTATIVI_MASSIMI}
                 order by segnato_il limit 100`

  let inviate = 0
  const errori: Record<string, string> = {}
  for (const r of righe) {
    const errore = await invia(Number(r.booking_id), Boolean(r.presente))
    if (errore) {
      errori[String(r.booking_id)] = errore
      await sql`update public.appello_presenze set errore_pg = ${errore.slice(0, 500)}, tentativi = tentativi + 1 where booking_id = ${r.booking_id}`
    } else {
      inviate++
      await sql`update public.appello_presenze set inviato_pg_il = now(), errore_pg = null where booking_id = ${r.booking_id}`
    }
  }
  return Response.json({ acceso: true, inviate, errori })
})
