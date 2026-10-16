import { redirect } from 'next/navigation'
import { logout } from '@/app/login/actions'
import { CambiaTema } from '@/components/CambiaTema'
import { Logo } from '@/components/Logo'
import { Menu } from '@/components/Menu'
import { Navigazione } from '@/components/Navigazione'
import { crm } from '@/lib/crm'
import { ha, puoRiunioni, puoVedere, SEZIONI, testoRuolo } from '@/lib/permessi'
import { cerca } from './azioni'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Il middleware ha controllato che ci sia una sessione; qui si controlla che
  // sia di qualcuno dello staff attivo.
  const io = await crm.io()
  if (!io) redirect('/login?error=non-autorizzato')

  const voci = [
    { href: '/dashboard', testo: 'Da gestire' },
    ...SEZIONI.filter((s) => puoVedere(io, s.chiave)).map(({ href, testo }) => ({ href, testo })),
    ...(ha(io, 'gestione_utenti') ? [{ href: '/dashboard/utenti', testo: 'Utenti' }] : []),
    ...(puoRiunioni(io) ? [{ href: '/dashboard/riunioni', testo: 'Report riunioni' }] : []),
    { href: '/dashboard/guida', testo: 'Guida' },
    { href: '/dashboard/aggiornamenti', testo: 'Aggiornamenti' },
  ]

  return (
    <div className="guscio">
      <aside className="barra">
        <div className="barra-logo">
          <Logo />
        </div>
        {puoVedere(io, 'cerca') && (
          <form action={cerca} className="barra-cerca">
            <input type="search" name="q" placeholder="Cerca nome, telefono, email" aria-label="Cerca una persona" />
          </form>
        )}
        <Menu>
          <Navigazione voci={voci} />
          <div className="barra-piede">
            <div className="barra-iniziali" aria-hidden="true">
              {(io.nome?.[0] ?? '') + (io.cognome?.[0] ?? '')}
            </div>
            <div className="barra-utente">
              <strong>{io.nome} {io.cognome}</strong>
              {io.ruolo !== 'consulente' && <span>{testoRuolo(io.ruolo)}</span>}
            </div>
            <CambiaTema />
            <form action={logout}>
              <button type="submit">Esci</button>
            </form>
          </div>
        </Menu>
      </aside>
      <main className="contenuto">{children}</main>
    </div>
  )
}
