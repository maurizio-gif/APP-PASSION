import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { BottoneInvio } from '@/components/BottoneInvio'
import { Logo } from '@/components/Logo'

async function impostaPassword(formData: FormData) {
  'use server'
  const password = String(formData.get('password') ?? '')
  const conferma = String(formData.get('conferma') ?? '')
  if (password.length < 8) redirect('/imposta-password?error=corta')
  if (password !== conferma) redirect('/imposta-password?error=diverse')

  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase.auth.updateUser({ password })
  if (error) redirect(`/imposta-password?error=${encodeURIComponent(error.message)}`)
  redirect('/dashboard')
}

const MESSAGGI: Record<string, string> = {
  corta: 'La password deve avere almeno 8 caratteri.',
  diverse: 'Le due password non coincidono.',
}

export default function ImpostaPassword({ searchParams }: { searchParams: { error?: string } }) {
  const errore = searchParams.error
  return (
    <main className="login">
      <div className="login-scheda">
        <div className="login-logo">
          <Logo larghezza={170} />
        </div>
        <p className="piccolo attenuato" style={{ marginTop: 0 }}>
          Scegli la password con cui entrerai d&apos;ora in poi.
        </p>
        {errore && <p className="avviso">{MESSAGGI[errore] ?? errore}</p>}
        <form action={impostaPassword}>
          <div className="campo">
            <label htmlFor="password">Nuova password</label>
            <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
          </div>
          <div className="campo">
            <label htmlFor="conferma">Ripetila</label>
            <input id="conferma" name="conferma" type="password" required minLength={8} autoComplete="new-password" />
          </div>
          <BottoneInvio testo="Salva e entra" inCorso="Salvataggio…" />
        </form>
      </div>
    </main>
  )
}
