// Il sync del mirror di PerfectGym.
//
// A ogni chiamata prende le entita' attive di `perfectgym.entita`, e per
// ciascuna scarica le pagine successive al suo cursore finche' ha tempo:
//
//   GET /odata/<Entita>?$filter=version gt <cursore>&$orderby=version
//
// Nessun `$top`: il server manda 500 righe e dice con `@odata.nextLink` se ce
// ne sono altre. Nessun `$skip`: la pagina dopo riparte dall'ultimo `version`
// letto, cosi' una riga che cambia mentre si scarica non fa scivolare niente.
// Ogni pagina finisce in `perfectgym.salva()`, che fa l'upsert.
//
// Quando un'entita' arriva in fondo passa in fase `delta`: lo stesso cursore,
// alla chiamata dopo, raccoglie solo cio' che e' cambiato nel frattempo.
//
// La chiama pg_cron ogni minuto con il token del Vault (`x-sync-token`), oppure
// a mano con la service key. Risponde subito e lavora in background, salvo
// `{"sincrono": true}`, utile nei collaudi. Parametri nel body JSON:
//   entita     elenco di entity set da fare (default: tutte le attive)
//   budget_ms  quanto lavorare al massimo (default 50.000, massimo 300.000)
//   attesa_ms  pausa fra una pagina e l'altra (default 300)
//
// Tre impostazioni per entita' cambiano la richiesta: `percorso` chiama un altro
// entity set (MemberLevels si legge da Members), `filtro` aggiunge una
// condizione a quella del cursore, `espandi` aggiunge un `$expand` - dentro il
// quale PerfectGym restituisce al massimo 100 elementi.

import postgres from 'npm:postgres@3.4.5'
import { soloServizio } from '../_shared/solo-servizio.ts'

const BASE = Deno.env.get('PERFECTGYM_URL') ?? 'https://passion.perfectgym.com/Api/v2.2'
const CLIENT_ID = Deno.env.get('PERFECTGYM_CLIENT_ID') ?? ''
const CLIENT_SECRET = Deno.env.get('PERFECTGYM_CLIENT_SECRET') ?? ''

// Quanti download iniziali portare avanti insieme.
const CORSIE = 4

const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { prepare: false, max: CORSIE + 1 })

type Opzioni = { entita?: string[]; budget_ms?: number; attesa_ms?: number }

type Riga = {
  nome: string
  chiave: string
  cursore_campo: 'version' | 'id'
  riscansione_ore: number | null
  fase: 'iniziale' | 'delta'
  cursore: string // bigint
  completato_il: string | null
  espandi: string | null
  percorso: string | null
  filtro: string | null
}

const dormi = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function tokenValido(req: Request): Promise<boolean> {
  if (soloServizio(req)) return true
  const token = req.headers.get('x-sync-token')
  if (!token) return false
  const [r] = await sql`select decrypted_secret from vault.decrypted_secrets where name = 'perfectgym_sync_token'`
  return Boolean(r) && r.decrypted_secret === token
}

// Una pagina dell'API, con tre tentativi sugli errori passeggeri.
async function pagina(url: string): Promise<{ righe: unknown[]; altre: boolean }> {
  let ultimo = ''
  for (let tentativo = 0; tentativo < 3; tentativo++) {
    if (tentativo) await dormi(2000 * tentativo)
    const r = await fetch(url, {
      headers: { 'X-Client-Id': CLIENT_ID, 'X-Client-Secret': CLIENT_SECRET, Accept: 'application/json' },
    })
    const testo = await r.text()
    if (r.ok) {
      const json = JSON.parse(testo)
      return { righe: json.value ?? [], altre: Boolean(json['@odata.nextLink']) }
    }
    ultimo = `${r.status} ${testo.slice(0, 300)}`
    if (r.status !== 429 && r.status < 500) break
  }
  throw new Error(ultimo)
}

async function lavora(opzioni: Opzioni) {
  const inizio = Date.now()
  const budget = Math.min(opzioni.budget_ms ?? 50_000, 300_000)
  const attesa = opzioni.attesa_ms ?? 300
  const resoconto: Record<string, unknown> = {}

  // Un giro alla volta: il lucchetto scade da solo se una chiamata muore a meta'.
  const presi = await sql`
    update perfectgym.sync_lucchetto
       set fino_a = now() + make_interval(secs => ${Math.ceil(budget / 1000) + 60})
     where id = 1 and (fino_a is null or fino_a < now())
    returning id`
  if (!presi.length) return { occupato: true }

  try {
    // Prima i controlli rapidi delle entita' gia' complete, ognuna solo quando e'
    // passato il suo intervallo; poi, col tempo che resta, i download iniziali.
    // Chiedendo entita' precise l'intervallo non conta.
    const scelte = opzioni.entita ?? null
    const entita = await sql<Riga[]>`
      select e.nome, e.chiave, e.cursore as cursore_campo, e.riscansione_ore,
             s.fase, s.cursore, s.completato_il, e.espandi, e.percorso, e.filtro
        from perfectgym.entita e
        join perfectgym.sync_stato s on s.entita = e.nome
       where e.attiva
         and (${scelte}::text[] is null or e.nome = any(${scelte}::text[]))
         and (${scelte}::text[] is not null
              or s.fase = 'iniziale'
              or s.ultimo_giro_il is null
              or s.ultimo_giro_il < now() - make_interval(mins => e.intervallo_minuti))
       order by s.fase = 'iniziale', e.ordine`

    // Le entita' senza `version` non dicono cosa e' cambiato: si rileggono da
    // capo. La rilettura torna in fase iniziale, cosi' se non finisce in un giro
    // riprende da dov'era invece di ricominciare ogni volta.
    const daRileggere = (e: Riga) =>
      e.cursore_campo === 'id' && e.fase === 'delta' && Boolean(e.riscansione_ore) &&
      (!e.completato_il || Date.now() - new Date(e.completato_il).getTime() > e.riscansione_ore! * 3_600_000)

    const unaEntita = async (e: Riga) => {
      let cursore = BigInt(e.cursore)
      if (daRileggere(e)) {
        cursore = 0n
        await sql`update perfectgym.sync_stato set fase = 'iniziale', cursore = 0 where entita = ${e.nome}`
      }

      const campo = e.cursore_campo === 'version' ? 'version' : e.chiave
      let righeTotali = 0
      let pagine = 0
      try {
        while (Date.now() - inizio < budget) {
          const t0 = Date.now()
          const filtro = `${campo} gt ${cursore}` + (e.filtro ? ` and ${e.filtro}` : '')
          const url = `${BASE}/odata/${e.percorso ?? e.nome}?$filter=${filtro}&$orderby=${campo}` +
            (e.espandi ? `&$expand=${e.espandi}` : '')
          const { righe, altre } = await pagina(url)
          let salvate = 0
          const da = cursore
          if (righe.length) {
            const [s] = await sql`select * from perfectgym.salva(${e.nome}, ${sql.json(righe)})`
            salvate = s.righe
            if (s.cursore_max != null) cursore = BigInt(s.cursore_max)
          }
          righeTotali += salvate
          pagine++
          await sql`
            update perfectgym.sync_stato
               set cursore = ${cursore.toString()},
                   righe_lette = righe_lette + ${salvate},
                   pagine_lette = pagine_lette + 1,
                   iniziato_il = coalesce(iniziato_il, now()),
                   ultimo_giro_il = now(),
                   ultimo_errore = null
             where entita = ${e.nome}`
          if (righe.length) {
            await sql`
              insert into perfectgym.sync_log (entita, durata_ms, righe, cursore_da, cursore_a)
              values (${e.nome}, ${Date.now() - t0}, ${salvate}, ${da.toString()}, ${cursore.toString()})`
          }
          if (!altre) {
            await sql`
              update perfectgym.sync_stato
                 set fase = 'delta', completato_il = now()
               where entita = ${e.nome}`
            break
          }
          await dormi(attesa)
        }
        resoconto[e.nome] = { righe: righeTotali, pagine, cursore: cursore.toString() }
      } catch (err) {
        const messaggio = String(err instanceof Error ? err.message : err).slice(0, 1000)
        await sql`
          update perfectgym.sync_stato
             set ultimo_errore = ${messaggio}, ultimo_errore_il = now()
           where entita = ${e.nome}`
        await sql`insert into perfectgym.sync_log (entita, errore) values (${e.nome}, ${messaggio})`
        resoconto[e.nome] = { righe: righeTotali, pagine, errore: messaggio }
      }
    }

    // Prima, una dopo l'altra, le entita' complete: una pagina o poco piu'.
    const lunghe = entita.filter((e) => e.fase === 'iniziale' || daRileggere(e))
    for (const e of entita) {
      if (lunghe.includes(e)) continue
      if (Date.now() - inizio > budget) break
      await unaEntita(e)
    }

    // Poi i download lunghi, fino a CORSIE alla volta: un'entita' lenta
    // (MemberNotes risponde in 10 secondi a pagina) non deve fermare le altre.
    const coda = [...lunghe]
    await Promise.all(Array.from({ length: CORSIE }, async () => {
      while (coda.length && Date.now() - inizio < budget) await unaEntita(coda.shift()!)
    }))
  } finally {
    await sql`update perfectgym.sync_lucchetto set fino_a = null where id = 1`
  }
  return { durata_ms: Date.now() - inizio, entita: resoconto }
}

Deno.serve(async (req) => {
  if (!(await tokenValido(req))) return new Response('Non autorizzato', { status: 401 })
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return Response.json({ errore: 'Mancano i secret PERFECTGYM_CLIENT_ID / PERFECTGYM_CLIENT_SECRET' }, { status: 500 })
  }
  const corpo = await req.json().catch(() => ({})) as Opzioni & { sincrono?: boolean }
  if (corpo.sincrono) return Response.json(await lavora(corpo))
  // @ts-ignore EdgeRuntime esiste nel runtime di Supabase
  EdgeRuntime.waitUntil(lavora(corpo).catch((e) => console.error('perfectgym-sync', e)))
  return Response.json({ avviato: true }, { status: 202 })
})
