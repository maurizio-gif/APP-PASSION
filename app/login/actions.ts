'use server'

import { redirect } from 'next/navigation'
import { ConfigurazioneMancante, createSupabaseServerClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')

  let esito: 'ok' | 'credenziali' | 'non-autorizzato'
  try {
    const supabase = createSupabaseServerClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      esito = 'credenziali'
    } else {
      // Un account di Supabase non basta: serve una riga attiva in
      // public.staff. Chi non ce l'ha esce subito, invece di entrare in una
      // dashboard in cui ogni lettura verrebbe rifiutata.
      const { data: io } = await supabase.rpc('crm_io')
      if (io) {
        esito = 'ok'
      } else {
        await supabase.auth.signOut()
        esito = 'non-autorizzato'
      }
    }
  } catch (errore) {
    if (errore instanceof ConfigurazioneMancante) {
      redirect(`/login?error=configurazione&variabile=${encodeURIComponent(errore.variabile)}`)
    }
    redirect('/login?error=database')
  }

  if (esito === 'ok') redirect('/dashboard')
  redirect(`/login?error=${esito}`)
}

export async function logout() {
  const supabase = createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect('/login')
}
