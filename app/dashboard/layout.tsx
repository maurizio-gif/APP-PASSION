import { redirect } from 'next/navigation'
import { logout } from '@/app/login/actions'
import { Logo } from '@/components/Logo'
import { Navigazione } from '@/components/Navigazione'
import { crm } from '@/lib/crm'
import { cerca } from './azioni'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Il middleware ha controllato che ci sia una sessione; qui si controlla che
  // sia di qualcuno dello staff attivo.
  const io = await crm.io()
  if (!io) redirect('/login?error=non-autorizzato')

  return (
    <div className="guscio">
      <aside className="barra">
        <div className="barra-logo">
          <Logo />
        </div>
        <form action={cerca} className="barra-cerca">
          <input type="search" name="q" placeholder="Cerca nome, telefono, email" aria-label="Cerca una persona" />
        </form>
        <Navigazione />
        <div className="barra-piede">
          <div>
            {io.nome} {io.cognome}
            {io.ruolo === 'admin' && <span className="attenuato"> · admin</span>}
          </div>
          <form action={logout}>
            <button type="submit">Esci</button>
          </form>
        </div>
      </aside>
      <main className="contenuto">{children}</main>
    </div>
  )
}
