'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

// Dove arriva il link dell'email di invito o di recupero password. Supabase
// allega la sessione in due forme a seconda di come e' partito il link
// (access_token nel frammento, oppure un "code" da scambiare): si gestiscono
// entrambe, poi si sceglie la password.
export default function AuthCallback() {
  const router = useRouter()
  const [errore, setErrore] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()

    async function completa() {
      const frammento = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const accessToken = frammento.get('access_token')
      const refreshToken = frammento.get('refresh_token')
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        if (error) return setErrore(error.message)
        return router.replace('/imposta-password')
      }

      const code = new URLSearchParams(window.location.search).get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) return setErrore(error.message)
        return router.replace('/imposta-password')
      }

      setErrore('Link non valido o scaduto. Chiedine uno nuovo.')
    }

    completa()
  }, [router])

  return (
    <main className="login">
      <div className="login-scheda" style={{ textAlign: 'center' }}>
        {errore ? <p className="avviso">{errore}</p> : <p className="attenuato">Un attimo…</p>}
      </div>
    </main>
  )
}
