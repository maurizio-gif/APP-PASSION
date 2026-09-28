import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { BottoneInvio } from '@/components/BottoneInvio'
import { Logo } from '@/components/Logo'

async function inviaLink(formData: FormData) {
  'use server'
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const sito = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const supabase = createSupabaseServerClient()
  // L'esito non si dice: rispondere "questa email non esiste" direbbe a chiunque
  // quali indirizzi hanno un account.
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${sito}/auth/callback` })
  redirect('/login?ok=email')
}

export default function RecuperaPassword() {
  return (
    <main className="login">
      <div className="login-scheda">
        <div className="login-logo">
          <Logo larghezza={170} />
        </div>
        <p className="piccolo attenuato" style={{ marginTop: 0 }}>
          Scrivi l&apos;email con cui entri: ti arriva un link per scegliere una nuova password.
        </p>
        <form action={inviaLink}>
          <div className="campo">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <BottoneInvio testo="Mandami il link" inCorso="Invio…" />
        </form>
        <p style={{ marginTop: 18, textAlign: 'center' }} className="piccolo">
          <Link href="/login">Torna all&apos;accesso</Link>
        </p>
      </div>
    </main>
  )
}
