'use client'

import { useState } from 'react'
import type { Operatore } from '@/lib/crm'
import { TIPI_TASK_NUOVI } from '@/lib/formato'
import { BottoneInvio } from '@/components/BottoneInvio'
import { nuovoTask } from '@/app/dashboard/azioni'

// «Nuovo task» nella scheda persona: si programma (una cosa da fare, con la
// data e le note di preparazione) o si registra (una cosa appena fatta: data e
// ora sono quelle di adesso, e si scrive com'e' andata).
export function NuovoTask({ utente, lead, torna, staff, io, domani }: {
  utente: string
  lead: string | null
  torna: string
  staff: Operatore[]
  io: string | null
  domani: string
}) {
  const [modo, setModo] = useState<'programma' | 'registra'>('programma')
  const registra = modo === 'registra'

  return (
    <form action={nuovoTask} className="modulo">
      <input type="hidden" name="utente" value={utente} />
      <input type="hidden" name="lead" value={lead ?? ''} />
      <input type="hidden" name="torna" value={torna} />
      <input type="hidden" name="modo" value={modo} />
      <div className="schede-vista scelta-task" role="radiogroup" aria-label="Programma o registra">
        <button type="button" role="radio" aria-checked={!registra} className={!registra ? 'attivo' : undefined} onClick={() => setModo('programma')}>
          Da programmare
        </button>
        <button type="button" role="radio" aria-checked={registra} className={registra ? 'attivo' : undefined} onClick={() => setModo('registra')}>
          Registra (già fatto)
        </button>
      </div>
      <div className="due-colonne">
        <div className="campo">
          <label htmlFor="nt-tipo">Task</label>
          <select id="nt-tipo" name="tipo" defaultValue="telefonata">
            {TIPI_TASK_NUOVI.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {registra ? (
          <div className="campo">
            <label htmlFor="nt-esito">Esito</label>
            <select id="nt-esito" name="esito" defaultValue="positivo">
              <option value="positivo">Positivo</option>
              <option value="negativo">Negativo</option>
            </select>
          </div>
        ) : (
          <div className="campo">
            <label htmlFor="nt-data">Quando</label>
            <input id="nt-data" type="datetime-local" name="data" defaultValue={domani} required />
          </div>
        )}
        <div className="campo">
          <label htmlFor="nt-chi">{registra ? 'Chi l’ha fatto' : 'A chi'}</label>
          <select id="nt-chi" name="assegnato" defaultValue={io ?? ''}>
            {staff.map((o) => <option key={o.id} value={o.id}>{o.nome} {o.cognome ?? ''}</option>)}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="nt-nota">{registra ? 'Note dell’esito' : 'Note di preparazione'}</label>
          <input id="nt-nota" type="text" name="nota" placeholder={registra ? 'Com’è andata' : 'Cosa preparare, cosa dire'} key={modo} />
        </div>
      </div>
      {registra && <p className="piccolo attenuato">Data e ora: adesso, al salvataggio.</p>}
      <BottoneInvio testo={registra ? 'Registra task' : 'Programma task'} inCorso="Salvataggio…" />
    </form>
  )
}
