import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export class ConfigurazioneMancante extends Error {
  constructor(public variabile: string) {
    super(`Manca la variabile d'ambiente ${variabile}`)
  }
}

export function configurazione() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const chiave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url) throw new ConfigurazioneMancante('NEXT_PUBLIC_SUPABASE_URL')
  if (!chiave) throw new ConfigurazioneMancante('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  return { url, chiave }
}

// Il client con la chiave anon e la sessione di chi e' entrato. E' l'unico
// client dell'app: il CRM si legge con le funzioni crm_* del database, che
// girano con i diritti del proprietario e controllano da sole che chi chiama
// sia nello staff. Nessuna chiave segreta passa da qui.
export function createSupabaseServerClient() {
  const { url, chiave } = configurazione()
  const cookieStore = cookies()

  return createServerClient(url, chiave, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Chiamato da un Server Component, che i cookie non li puo' scrivere:
          // il middleware li rinfresca comunque alla richiesta successiva.
        }
      },
    },
  })
}
