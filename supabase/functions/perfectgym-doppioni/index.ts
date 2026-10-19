// I doppioni di PerfectGym: segnarli come cancellati (isDeleted = true).
//
//   POST { "azione": "prova" }
//        Nessuna modifica. Prova la ricerca per email (solo anagrafiche non
//        cancellate) e le strade per scrivere isDeleted su un member che non
//        esiste: dice quale l'API accetta, senza toccare nessuno.
//   POST { "azione": "cancella", "strada": "patch_dettagli", "members": [123, 456], "forza": [456] }
//        Segna i member come cancellati. Prima ricontrolla sul mirror che
//        ognuno sia davvero un doppione: un'altra anagrafica non cancellata con
//        la stessa email, e nessuna attivita' (contratti, ingressi,
//        prenotazioni, transazioni, prodotti). Chi ha attivita' passa solo se
//        e' anche in `forza`. Dopo la scrittura rilegge il member da PerfectGym
//        e dice se isDeleted e' davvero true.
//
// Le API non hanno un "elimina member": la cancellazione e' una modifica del
// contatto. Il mirror la vede al giro successivo di perfectgym-sync (ogni
// minuto) e il CRM nasconde la persona o la riaggancia all'anagrafica rimasta
// (`crm.collega_soci()`, migrazione 20261019a).
//
// Si chiama con una chiave segreta del progetto o con il token del Vault
// (`x-sync-token`), come perfectgym-probe, cosi' la si lancia dal database
// con pg_net.

import postgres from 'npm:postgres@3.4.5'
import { chiaveSegreta } from '../_shared/solo-servizio.ts'

const BASE = Deno.env.get('PERFECTGYM_URL') ?? 'https://passion.perfectgym.com/Api/v2.2'
const ORIGINE = new URL(BASE).origin
const CLIENT_ID = Deno.env.get('PERFECTGYM_CLIENT_ID') ?? ''
const CLIENT_SECRET = Deno.env.get('PERFECTGYM_CLIENT_SECRET') ?? ''
const INTESTAZIONI = { 'X-Client-Id': CLIENT_ID, 'X-Client-Secret': CLIENT_SECRET, Accept: 'application/json' }

// Un id che non esiste: le prove di scrittura non possono toccare nessuno.
const NESSUNO = 999999999

type Esito = { status: number; corpo: string }

async function chiama(metodo: string, url: string, corpo?: unknown, tipo = 'application/json'): Promise<Esito> {
  try {
    const r = await fetch(url, {
      method: metodo,
      headers: corpo === undefined ? INTESTAZIONI : { ...INTESTAZIONI, 'Content-Type': tipo },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      signal: AbortSignal.timeout(15000),
    })
    return { status: r.status, corpo: (await r.text()).slice(0, 600) }
  } catch (e) {
    return { status: 0, corpo: String(e).slice(0, 300) }
  }
}

// Le strade per scrivere isDeleted: UpdateMemberDetails in PATCH (JSON Patch,
// che PerfectGym vuole come application/json-patch+json) o in POST. La PATCH
// rifiuta IsDeleted (non e' nel PersonalDataModel); la POST sostituisce i dati
// anagrafici, quindi li rimanda uguali, presi dal mirror. Quale funziona lo
// dice la rilettura dopo la scrittura.
const PATCH = 'application/json-patch+json'
type Dati = Record<string, unknown>
const STRADE: Record<string, (id: number, d: Dati) => [string, string, unknown, string?]> = {
  patch_dettagli: (id) => ['PATCH', `${ORIGINE}/Api/v2.2/Members/UpdateMemberDetails/${id}`,
    [{ op: 'replace', path: 'IsDeleted', value: true }], PATCH],
  post_dettagli: (id, d) => ['POST', `${ORIGINE}/Api/v2.2/Members/UpdateMemberDetails`, {
    memberId: id,
    isDeleted: true,
    personalData: {
      firstName: d.firstName, lastName: d.lastName, email: d.email, phoneNumber: d.phoneNumber,
      sex: d.sex, personalId: d.personalId,
      birthDate: typeof d.birthdate === 'string' ? d.birthdate.slice(0, 10) : undefined,
      isDeleted: true,
    },
  }],
}

async function leggi(id: number): Promise<{ isDeleted?: boolean; errore?: string }> {
  const r = await chiama('GET', `${ORIGINE}/Api/v2.2/odata/Members?$select=id,isDeleted&$filter=${encodeURIComponent(`id eq ${id}`)}`)
  if (r.status !== 200) return { errore: `${r.status} ${r.corpo.slice(0, 200)}` }
  const m = JSON.parse(r.corpo)?.value?.[0]
  return m ? { isDeleted: m.isDeleted === true } : { errore: 'member non trovato' }
}

async function prova(sql: postgres.Sql) {
  // Un'email con doppioni, per vedere che il filtro usato da n8n funziona.
  const [d] = await sql`
    select lower(trim(email)) as email, count(*)::int as n
      from perfectgym.members
     where not is_deleted and coalesce(trim(email), '') not in ('', '***')
     group by 1 having count(*) > 1 limit 1`
  const filtro = `email eq '${String(d?.email ?? '').replace(/'/g, "''")}' and isDeleted eq false`
  const ricerca = await chiama('GET', `${ORIGINE}/Api/v2.1/odata/Members?$select=id&$filter=${encodeURIComponent(filtro)}`)
  let trovati: number | null = null
  try { trovati = JSON.parse(ricerca.corpo)?.value?.length ?? null } catch { /* non JSON */ }

  const scritture: Record<string, Esito> = {}
  for (const [nome, strada] of Object.entries(STRADE)) {
    const [metodo, url, corpo, tipo] = strada(NESSUNO, {})
    scritture[nome] = await chiama(metodo, url, corpo, tipo)
  }
  return { ricerca: { status: ricerca.status, attesi: d?.n ?? null, trovati }, scritture }
}

async function cancella(sql: postgres.Sql, ids: number[], forza: Set<number>, strada: string) {
  const esiti: Record<string, unknown>[] = []
  for (const id of ids) {
    const [m] = await sql`
      select m.id, m.is_deleted, m.dati, lower(trim(m.email)) as email,
             (select count(*) from perfectgym.members o
               where o.id <> m.id and not o.is_deleted and lower(trim(o.email)) = lower(trim(m.email)))::int as altri,
             ((select count(*) from perfectgym.contracts c where c.member_id = m.id and not c.is_deleted)
            + (select count(*) from perfectgym.member_club_visits v where v.member_id = m.id and not v.is_deleted)
            + (select count(*) from perfectgym.class_bookings b where b.member_id = m.id and not b.is_deleted)
            + (select count(*) from perfectgym.transactions t where t.member_id = m.id and not t.is_deleted)
            + (select count(*) from perfectgym.member_products p where p.member_id = m.id and not p.is_deleted))::int as attivita
        from perfectgym.members m where m.id = ${id}`
    if (!m) { esiti.push({ id, esito: 'saltato', motivo: 'non e\' nel mirror' }); continue }
    if (m.is_deleted) { esiti.push({ id, esito: 'gia_cancellato' }); continue }
    if (!m.email || m.email === '***' || m.altri === 0) {
      esiti.push({ id, esito: 'saltato', motivo: 'nessun\'altra anagrafica con la stessa email: non e\' un doppione' })
      continue
    }
    if (m.attivita > 0 && !forza.has(id)) {
      esiti.push({ id, esito: 'saltato', motivo: `ha ${m.attivita} attivita' (contratti, ingressi...): serve forza` })
      continue
    }
    const [metodo, url, corpo, tipo] = STRADE[strada](id, m.dati ?? {})
    const r = await chiama(metodo, url, corpo, tipo)
    if (r.status < 200 || r.status >= 300) {
      esiti.push({ id, esito: 'errore', status: r.status, risposta: r.corpo })
      continue
    }
    const dopo = await leggi(id)
    esiti.push({ id, esito: dopo.isDeleted ? 'cancellato' : 'non_confermato', ...dopo })
  }
  return esiti
}

async function autorizzato(req: Request, sql: postgres.Sql): Promise<boolean> {
  if (chiaveSegreta(req)) return true
  const token = req.headers.get('x-sync-token')
  if (!token) return false
  const [r] = await sql`select decrypted_secret from vault.decrypted_secrets where name = 'perfectgym_sync_token'`
  return Boolean(r) && r.decrypted_secret === token
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Solo POST', { status: 405 })
  const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { prepare: false, max: 1, idle_timeout: 1, connect_timeout: 10 })
  try {
    if (!(await autorizzato(req, sql))) return new Response('Non autorizzato', { status: 401 })
    if (!CLIENT_ID || !CLIENT_SECRET) {
      return Response.json({ errore: 'Mancano i secret PERFECTGYM_CLIENT_ID / PERFECTGYM_CLIENT_SECRET' }, { status: 500 })
    }
    const corpo = await req.json().catch(() => null)
    if (corpo?.azione === 'prova') return Response.json(await prova(sql))
    if (corpo?.azione === 'cancella') {
      const ids = (Array.isArray(corpo.members) ? corpo.members : []).map(Number).filter(Number.isSafeInteger)
      if (!ids.length || ids.length > 500) return Response.json({ errore: 'Servono da 1 a 500 member' }, { status: 400 })
      const strada = typeof corpo.strada === 'string' && corpo.strada in STRADE ? corpo.strada : null
      if (!strada) return Response.json({ errore: `Serve la strada: ${Object.keys(STRADE).join(', ')}` }, { status: 400 })
      const forza = new Set<number>((Array.isArray(corpo.forza) ? corpo.forza : []).map(Number))
      return Response.json({ esiti: await cancella(sql, ids, forza, strada) })
    }
    return Response.json({ errore: 'azione: prova | cancella' }, { status: 400 })
  } finally {
    await sql.end({ timeout: 2 })
  }
})
