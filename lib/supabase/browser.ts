import { createBrowserClient } from '@supabase/ssr'

// Usato dalla pagina che riceve il link di invito o di recupero password, per
// trasformare il token del link in una sessione, e da CaricaAllegati, che
// carica gli allegati dei ticket dritti su Storage con la sessione di chi e'
// entrato.
export function createSupabaseBrowserClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}
