// I webhook di PerfectGym.
//
// Due porte:
//   - POST ?t=<token>          PerfectGym consegna un evento. Si scrive in
//                              `perfectgym.webhook_eventi`, si risponde 200 e,
//                              in background, si rileggono da PerfectGym le
//                              righe che l'evento tocca;
//   - POST {"coda": true}      pg_cron, ogni minuto, con `x-sync-token`:
//                              riprova gli eventi rimasti indietro.
//
// L'evento e' un campanello, non la verita': porta pochi campi e a volte
// nemmeno l'id della riga (ContractPaymentDone ha il contratto, non il
// pagamento). Per ogni tipo di evento `RILETTURE` dice quali entita' rileggere
// e con quale filtro; le righe finiscono nel mirror con `perfectgym.salva()`,
// come quelle del sync.
//
// PerfectGym non firma le chiamate: la protezione e' il token nell'URL, che
// sta nel Vault (`perfectgym_webhook_token`). Per questo `verify_jwt` e' spento.

import postgres from 'npm:postgres@3.4.5'
import { chiaveSegreta } from '../_shared/solo-servizio.ts'

const BASE = Deno.env.get('PERFECTGYM_URL') ?? 'https://passion.perfectgym.com/Api/v2.2'
const CLIENT_ID = Deno.env.get('PERFECTGYM_CLIENT_ID') ?? ''
const CLIENT_SECRET = Deno.env.get('PERFECTGYM_CLIENT_SECRET') ?? ''

const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { prepare: false, max: 2 })

// deno-lint-ignore no-explicit-any
type Dati = Record<string, any>
type Rilettura = { entita: string; filtro: string }

const n = (v: unknown) => (typeof v === 'number' || (typeof v === 'string' && /^\d+$/.test(v)) ? Number(v) : null)

// Cosa rileggere per ogni evento. Un filtro null vuol dire che manca il campo
// che serve, e quella rilettura si salta.
const RILETTURE: Record<string, (d: Dati) => (Rilettura | null)[]> = {
  ContractCreated: (d) => [
    n(d.contractId) && { entita: 'Contracts', filtro: `id eq ${n(d.contractId)}` },
    n(d.userId) && { entita: 'Members', filtro: `id eq ${n(d.userId)}` },
  ],
  // Il pagamento non ha il suo id nell'evento: si rileggono gli ultimi pagamenti
  // del contratto, e il saldo del socio.
  ContractPaymentDone: (d) => [
    n(d.contractId) && { entita: 'ContractPayments', filtro: `contractId eq ${n(d.contractId)}&$orderby=version desc&$top=20` },
    n(d.contractId) && { entita: 'Contracts', filtro: `id eq ${n(d.contractId)}` },
    n(d.userId) && { entita: 'MemberBalances', filtro: `memberId eq ${n(d.userId)}` },
  ],
  UserModified: (d) => [
    n(d.userId) && { entita: 'Members', filtro: `id eq ${n(d.userId)}` },
    n(d.userId) && { entita: 'MemberCustomAttributes', filtro: `memberId eq ${n(d.userId)}` },
    n(d.userId) && { entita: 'MemberAgreementAnswers', filtro: `memberId eq ${n(d.userId)}` },
    n(d.userId) && { entita: 'MemberBalances', filtro: `memberId eq ${n(d.userId)}` },
    n(d.userId) && { entita: 'MemberRelations', filtro: `parentMemberId eq ${n(d.userId)} or childMemberId eq ${n(d.userId)}` },
  ],
  AgreementAnswerModified: (d) => [
    n(d.userId) && { entita: 'MemberAgreementAnswers', filtro: `memberId eq ${n(d.userId)}` },
  ],
  // Il passaggio al tornello puo' segnare da solo la presenza alla lezione
  // (`hasAttended`): si rileggono anche le ultime prenotazioni del socio, cosi'
  // la presenza alla lezione si vede subito e non al prossimo giro del sync.
  UserPresenceChanged: (d) => [
    n(d.userId) && { entita: 'MemberClubVisits', filtro: `memberId eq ${n(d.userId)}&$orderby=version desc&$top=5` },
    n(d.userId) && { entita: 'ClassBookings', filtro: `memberId eq ${n(d.userId)}&$orderby=version desc&$top=10` },
  ],
  ClassesBooked: prenotazione,
  ClassesBookedOnStandbyList: prenotazione,
  ClassesBookingCancelled: prenotazione,
  ClassesBookingPromotedFromStandbyList: prenotazione,
  PersonalTrainingBooked: (d) => [
    n(d.personalTrainingBookingId) && { entita: 'PersonalTrainingBookings', filtro: `id eq ${n(d.personalTrainingBookingId)}` },
  ],
  PersonalTrainingBookingCancelled: (d) => [
    n(d.personalTrainingBookingId) && { entita: 'PersonalTrainingBookings', filtro: `id eq ${n(d.personalTrainingBookingId)}` },
  ],
  // Nessuna entita' da rileggere: l'evento e' la traccia.
  UserCardScanned: () => [],
}

function prenotazione(d: Dati): (Rilettura | null)[] {
  const lezione = n(d.timeTableEventId)
  const socio = n(d.userId)
  if (!lezione) return []
  return [
    { entita: 'Classes', filtro: `id eq ${lezione}` },
    socio ? { entita: 'ClassBookings', filtro: `classId eq ${lezione} and memberId eq ${socio}` } : null,
  ]
}

// La rilettura chiede la riga come la chiede il sync: con lo stesso `$expand`
// (e lo stesso entity set) configurati in `perfectgym.entita`. Senza, un
// Personal Training riletto dal webhook tornerebbe senza i suoi dettagli -
// trainer, cliente, orari - e `salva()` li cancellerebbe dalla riga.
async function leggi(entita: string, filtro: string): Promise<unknown[]> {
  const [conf] = await sql`select espandi, percorso from perfectgym.entita where nome = ${entita}`
  const url = `${BASE}/odata/${conf?.percorso ?? entita}?$filter=${filtro}` +
    (conf?.espandi ? `&$expand=${conf.espandi}` : '')
  let ultimo = ''
  for (let tentativo = 0; tentativo < 3; tentativo++) {
    if (tentativo) await new Promise((r) => setTimeout(r, 1500 * tentativo))
    const r = await fetch(url, {
      headers: { 'X-Client-Id': CLIENT_ID, 'X-Client-Secret': CLIENT_SECRET, Accept: 'application/json' },
    })
    const testo = await r.text()
    if (r.ok) return JSON.parse(testo).value ?? []
    ultimo = `${entita}: ${r.status} ${testo.slice(0, 300)}`
    if (r.status !== 429 && r.status < 500) break
  }
  throw new Error(ultimo)
}

type Evento = { id: string; evento: string | null; payload: Dati }

async function elabora(ev: Evento) {
  const regola = ev.evento ? RILETTURE[ev.evento] : undefined
  if (!regola) {
    await sql`update perfectgym.webhook_eventi set stato = 'ignorato', elaborato_il = now(), errore = 'evento sconosciuto' where id = ${ev.id}`
    return
  }
  const riletto: Record<string, number> = {}
  try {
    for (const r of regola(ev.payload?.data ?? {})) {
      if (!r) continue
      const righe = await leggi(r.entita, r.filtro)
      if (righe.length) await sql`select perfectgym.salva(${r.entita}, ${sql.json(righe)})`
      riletto[r.entita] = (riletto[r.entita] ?? 0) + righe.length
    }
    await sql`
      update perfectgym.webhook_eventi
         set stato = 'fatto', elaborato_il = now(), riletto = ${sql.json(riletto)}, errore = null
       where id = ${ev.id}`
  } catch (err) {
    const messaggio = String(err instanceof Error ? err.message : err).slice(0, 1000)
    await sql`
      update perfectgym.webhook_eventi
         set stato = 'errore', riletto = ${sql.json(riletto)}, errore = ${messaggio}
       where id = ${ev.id}`
  }
}

async function elaboraLotto(ids: string[] | null) {
  const presi = await sql<Evento[]>`select id, evento, payload from perfectgym.webhook_prendi(50, ${ids}::bigint[])`
  for (const ev of presi) await elabora(ev)
  return presi.length
}

async function tokenDelVault(nome: string): Promise<string | null> {
  const [r] = await sql`select decrypted_secret from vault.decrypted_secrets where name = ${nome}`
  return r?.decrypted_secret ?? null
}

async function ricevi(req: Request): Promise<Response> {
  const testo = await req.text()
  let corpo: unknown
  try {
    corpo = JSON.parse(testo)
  } catch {
    return new Response('JSON non valido', { status: 400 })
  }
  // Di solito un evento solo; se ne arrivano piu' insieme, uno per riga.
  const eventi = (Array.isArray(corpo) ? corpo : [corpo]) as Dati[]
  const ids: string[] = []
  for (const e of eventi) {
    const [riga] = await sql`
      insert into perfectgym.webhook_eventi (evento, scattato_il, member_id, payload, hash)
      values (
        ${e?.event ?? null},
        ${e?.triggeredDate ?? null},
        ${n(e?.data?.userId)},
        ${sql.json(e)},
        md5(${JSON.stringify(e)})
      )
      on conflict (hash) do nothing
      returning id`
    if (riga) ids.push(riga.id)
  }
  if (ids.length) {
    // @ts-ignore EdgeRuntime esiste nel runtime di Supabase
    EdgeRuntime.waitUntil(elaboraLotto(ids).catch((e) => console.error('perfectgym-webhook', e)))
  }
  return Response.json({ ricevuti: eventi.length, nuovi: ids.length })
}

Deno.serve(async (req) => {
  const url = new URL(req.url)

  // Consegna da PerfectGym.
  const t = url.searchParams.get('t')
  if (t !== null) {
    if (t !== (await tokenDelVault('perfectgym_webhook_token'))) return new Response('Non autorizzato', { status: 401 })
    // Una GET e' la prova di raggiungibilita' che alcuni pannelli fanno al salvataggio.
    if (req.method !== 'POST') return Response.json({ ok: true })
    return await ricevi(req)
  }

  // Coda: pg_cron o una chiamata a mano.
  const sync = req.headers.get('x-sync-token')
  const autorizzato = chiaveSegreta(req) || (sync !== null && sync === (await tokenDelVault('perfectgym_sync_token')))
  if (!autorizzato) return new Response('Non autorizzato', { status: 401 })
  const fatti = await elaboraLotto(null)
  return Response.json({ elaborati: fatti })
})
