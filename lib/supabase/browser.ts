import { createBrowserClient } from '@supabase/ssr'

// Usato solo dalla pagina che riceve il link di invito o di recupero password,
// per trasformare il token del link in una sessione.
export function createSupabaseBrowserClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}
