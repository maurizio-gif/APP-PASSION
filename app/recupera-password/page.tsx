import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { BottoneInvio } from '@/components/BottoneInvio'
import { Logo } from '@/components/Logo'

async function inviaLink(formData: FormData) {
  'use server'
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const sito = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  // Flusso «implicit» e non PKCE: con PKCE il link dell'email si puo' aprire solo sullo stesso browser da cui
  // e' stato chiesto (il browser tiene il «verificatore»), e chi lo apre dal telefono o dall'app della posta
  // trova «PKCE code verifier not found». Cosi' il link porta la sessione con se' e si apre ovunque, come
  // gli inviti (supabase/functions/crm-invito); /auth/callback sa gia' leggere questa forma.
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { flowType: 'implicit', persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
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
