'use client'

import { useEffect, useState } from 'react'
import { segnaPresenze } from '@/app/dashboard/azioni'
import type { LezioneAppello } from '@/lib/crm'
import { formatoOra } from '@/lib/formato'

// Una lezione dell'Appello istruttore: i prenotati con la spunta «Presente».
// Si segna solo da 59 minuti prima dell'inizio a 59 minuti dopo la fine (la
// schermata abilita e disabilita le spunte da sola, ogni mezzo minuto; il
// controllo vero e' nel database, che rifiuta il resto). Fuori da quella
// finestra i prenotati si leggono soltanto.
export function AppelloLezione({ l }: { l: LezioneAppello }) {
  const [presenze, setPresenze] = useState<Record<number, boolean>>(() => Object.fromEntries(l.prenotati.map((p) => [p.booking_id, p.presente])))
  const [inCorso, setInCorso] = useState<number[]>([])
  const [errore, setErrore] = useState<string | null>(null)
  // Fino al primo giro nel browser vale lo stato calcolato dal server: cosi' server e browser scrivono lo stesso.
  const [ora, setOra] = useState<number | null>(null)
  useEffect(() => {
    setOra(Date.now())
    const t = setInterval(() => setOra(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  const stato = ora == null ? l.finestra : ora < Date.parse(l.apre_il) ? 'presto' : ora > Date.parse(l.chiude_il) ? 'chiuso' : 'aperto'
  const aperto = stato === 'aperto'
  const presenti = l.prenotati.filter((p) => presenze[p.booking_id]).length

  async function cambia(ids: number[], valore: boolean) {
    setErrore(null)
    const prima = presenze
    setPresenze((p) => ({ ...p, ...Object.fromEntries(ids.map((i) => [i, valore])) }))
    setInCorso((c) => [...c, ...ids])
    const r = await segnaPresenze(ids, valore)
    setInCorso((c) => c.filter((i) => !ids.includes(i)))
    if (!r.ok) {
      setPresenze(prima)
      setErrore(r.errore)
    }
  }

  const daSegnare = l.prenotati.filter((p) => !presenze[p.booking_id]).map((p) => p.booking_id)

  return (
    <section className="scheda appello-lezione" id={`lezione-${l.class_id}`}>
      <div className="appello-testa">
        <div>
          <h3 className="appello-titolo">
            {formatoOra(l.inizio)}
            {l.fine ? `–${formatoOra(l.fine)}` : ''} · {l.lezione ?? 'Lezione'}
          </h3>
          <div className="piccolo attenuato">
            {[l.sala, l.istruttore].filter(Boolean).join(' · ')}
            {l.sala || l.istruttore ? ' · ' : ''}
            {l.prenotati.length} {l.prenotati.length === 1 ? 'prenotato' : 'prenotati'}
            {l.posti ? ` su ${l.posti} posti` : ''}
          </div>
        </div>
        <div className="appello-stato">
          {stato === 'aperto' && <span className="bollino verde">Appello aperto fino alle {formatoOra(l.chiude_il)}</span>}
          {stato === 'presto' && <span className="bollino giallo">Si apre alle {formatoOra(l.apre_il)}</span>}
          {stato === 'chiuso' && <span className="bollino grigio">Appello chiuso</span>}
          <div className="piccolo attenuato">
            {presenti} {presenti === 1 ? 'presente' : 'presenti'}
          </div>
        </div>
      </div>

      {l.prenotati.length === 0 ? (
        <p className="vuoto">Nessun prenotato.</p>
      ) : (
        <ul className="appello-elenco">
          {l.prenotati.map((p) => (
            <li key={p.booking_id}>
              <label className={`appello-riga${presenze[p.booking_id] ? ' presente' : ''}`}>
                <input
                  type="checkbox"
                  checked={Boolean(presenze[p.booking_id])}
                  disabled={!aperto || inCorso.includes(p.booking_id)}
                  onChange={(e) => cambia([p.booking_id], e.target.checked)}
                />
                <span>
                  {p.cognome ?? ''} {p.nome ?? ''}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}

      {aperto && daSegnare.length > 1 && (
        <button type="button" className="bottone secondario piccolo" onClick={() => cambia(daSegnare, true)} disabled={inCorso.length > 0}>
          Tutti presenti
        </button>
      )}
      {errore && (
        <p className="piccolo" role="alert" style={{ color: 'var(--rosso)' }}>
          {errore}
        </p>
      )}
    </section>
  )
}
