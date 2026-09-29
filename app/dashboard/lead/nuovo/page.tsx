import { richiediSezione } from '@/lib/crm'
import Link from 'next/link'
import { FONTE } from '@/lib/formato'
import { Avviso } from '@/components/Ui'
import { BottoneInvio } from '@/components/BottoneInvio'
import { nuovoLead } from '../../azioni'

// Il lead che arriva al desk o al telefono: il tour (walk-in), la telefonata in
// ingresso. Quelli del sito, di Meta e dei referral arrivano da soli. Creato
// qui, va anche su PerfectGym (azione nuovoLead, Edge Function crm-perfectgym-lead).
export default async function NuovoLead({ searchParams }: { searchParams: { errore?: string } }) {
  await richiediSezione('lead')
  return (
    <>
      <div className="testata">
        <div>
          <h1>Nuovo lead</h1>
          <p>Se la persona c&apos;è già (stesso telefono o email) il lead si aggancia alla sua scheda.
            Il lead nasce anche su PerfectGym, se la persona non c&apos;è già.</p>
        </div>
        <Link href="/dashboard/lead">← Lead</Link>
      </div>
      <Avviso errore={searchParams.errore} />

      <form action={nuovoLead} className="scheda modulo" style={{ maxWidth: 640 }}>
        <div className="due-colonne">
          <div className="campo">
            <label htmlFor="nome">Nome</label>
            <input id="nome" name="nome" type="text" autoFocus />
          </div>
          <div className="campo">
            <label htmlFor="cognome">Cognome</label>
            <input id="cognome" name="cognome" type="text" />
          </div>
          <div className="campo">
            <label htmlFor="telefono">Telefono</label>
            <input id="telefono" name="telefono" type="text" inputMode="tel" placeholder="333 1234567" />
          </div>
          <div className="campo">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" />
          </div>
          <div className="campo">
            <label htmlFor="fonte">Fonte</label>
            <select id="fonte" name="fonte" defaultValue="tour" required>
              {Object.entries(FONTE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="fonte_dettaglio">Dettaglio fonte</label>
            <input id="fonte_dettaglio" name="fonte_dettaglio" type="text" placeholder="Telefonata in ingresso, amico di…" />
          </div>
        </div>
        <div className="campo">
          <label htmlFor="attivita">Attività di interesse</label>
          <input id="attivita" name="attivita" type="text" placeholder="Sala pesi, Pilates Reformer, Formula 8…" />
        </div>
        <div className="campo">
          <label htmlFor="nota">Primo commento</label>
          <textarea id="nota" name="nota" rows={3} placeholder="Com'è andato il tour, cosa cerca, quando richiamare" />
        </div>
        <label className="spunta">
          <input type="checkbox" name="privacy" /> Ha dato il consenso al trattamento dei dati (privacy)
        </label>
        <label className="spunta">
          <input type="checkbox" name="prendo" defaultChecked /> Lo prendo in carico io
        </label>
        <BottoneInvio testo="Crea il lead" inCorso="Salvataggio…" />
      </form>
    </>
  )
}
