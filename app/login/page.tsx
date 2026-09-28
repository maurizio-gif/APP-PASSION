import Link from 'next/link'
import { login } from './actions'
import { BottoneInvio } from '@/components/BottoneInvio'
import { Logo } from '@/components/Logo'

const MESSAGGI: Record<string, string> = {
  credenziali: 'Email o password errate.',
  'non-autorizzato': "Questo account non è abilitato all'app. Chiedi a chi la gestisce di aggiungerti allo staff.",
  database: 'Il database non ha risposto. Riprova fra un minuto.',
}

export default function LoginPage({ searchParams }: { searchParams: { error?: string; variabile?: string; ok?: string } }) {
  const errore = searchParams.error
  return (
    <main className="login">
      <div className="login-scheda">
        <div className="login-logo">
          <Logo larghezza={170} />
        </div>

        {searchParams.ok === 'password' && <p className="avviso ok">Password aggiornata. Adesso puoi entrare.</p>}
        {searchParams.ok === 'email' && (
          <p className="avviso ok">Se l&apos;indirizzo è registrato, ti è arrivata un&apos;email con il link.</p>
        )}
        {errore === 'configurazione' ? (
          <p className="avviso">
            L&apos;app non è configurata: manca la variabile d&apos;ambiente <strong>{searchParams.variabile}</strong>.
          </p>
        ) : (
          errore && <p className="avviso">{MESSAGGI[errore] ?? 'Accesso non riuscito.'}</p>
        )}

        <form action={login}>
          <div className="campo">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="campo">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" required autoComplete="current-password" />
          </div>
          <BottoneInvio testo="Entra" inCorso="Accesso…" />
        </form>

        <p style={{ marginTop: 18, textAlign: 'center' }} className="piccolo">
          <Link href="/recupera-password">Password dimenticata?</Link>
        </p>
      </div>
    </main>
  )
}
