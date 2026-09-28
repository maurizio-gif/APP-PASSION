// Lascia passare solo chi ha una chiave di servizio del progetto.
//
// Il gateway con `verify_jwt` accetta anche la chiave anon, che sta nel sito
// pubblico: da sola non basta a proteggere una funzione che chiama PerfectGym.
// Qui passano la chiave segreta nuova (`sb_secret_...`, confrontata con quelle
// che Supabase mette in `SUPABASE_SECRET_KEYS`), la service key legacy e un JWT
// con `role = service_role` (quello che usa pg_net dal database).

function segreti(): string[] {
  const out: string[] = []
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (legacy) out.push(legacy)
  try {
    const mappa = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}')
    for (const v of Object.values(mappa)) if (typeof v === 'string') out.push(v)
  } catch {
    // variabile assente o non JSON: restano le altre strade
  }
  return out
}

function ruoloJwt(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.role ?? null
  } catch {
    return null
  }
}

// Solo le chiavi segrete, senza la strada del JWT: e' quella da usare nelle
// funzioni con `verify_jwt` spento, dove nessuno ha verificato la firma di un
// JWT e un `role: service_role` si potrebbe scrivere a mano.
export function chiaveSegreta(req: Request): boolean {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  return Boolean(token) && segreti().includes(token)
}

export function soloServizio(req: Request): boolean {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return false
  if (segreti().includes(token)) return true
  // Un JWT arriva qui solo dopo che il gateway ne ha verificato la firma.
  return ruoloJwt(token) === 'service_role'
}
