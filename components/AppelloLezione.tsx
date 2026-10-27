'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { segnaPresenze } from '@/app/dashboard/azioni'
import type { LezioneAppello, PrenotatoAppello } from '@/lib/crm'
import { eta, formatoData, formatoOra } from '@/lib/formato'
import { Segnali } from './SegnaliAppello'

// Una lezione dell'appello, impaginata come nel CRM Athlon e pensata per il
// telefono: l'appello si fa in piedi davanti alla sala, con una mano.
//
// - Un tocco, una presenza: tutta la riga e' il pulsante. Il cerchio con la
//   spunta e «Segna presente» dicono cosa succede toccando; segnata, la riga
//   diventa verde con «Presente». La riga cambia subito, il server conferma dopo.
// - Togliere una presenza chiede conferma, sotto la riga: e' una correzione.
// - Sotto il nome, in piccolo, i segnali (Prova, Nuovo iscritto, First Timer) e
//   chi ha segnato la presenza e a che ora («tornello/PG» se viene da PerfectGym).
// - Si segna da 59 minuti prima dell'inizio a 59 minuti dopo la fine: fuori da
//   questa finestra le righe si leggono e basta (la testata dice da che ora si
//   segna). Il controllo vero e' nel database.
// - `soloLettura` e' l'Appello complessivo: le stesse righe, senza segnare.

const breve = (completo: string | null) => {
  if (!completo) return '—'
  const [primo, ...resto] = completo.split(' ').filter(Boolean)
  return !primo || resto.length === 0 || completo.includes('@') ? completo : `${primo} ${resto[resto.length - 1][0]}.`
}
const nomeCompleto = (p: PrenotatoAppello) => `${p.nome ?? ''} ${p.cognome ?? ''}`.trim() || 'Senza nome'

export function AppelloLezione({ l, soloLettura = false }: { l: LezioneAppello; soloLettura?: boolean }) {
  const [presenze, setPresenze] = useState<Record<number, boolean>>(() => Object.fromEntries(l.prenotati.map((p) => [p.booking_id, p.presente])))
  // Le presenze che ho segnato io in questa pagina, con l'ora: finche' il server non le rilegge non hanno ancora «chi».
  const [mie, setMie] = useState<Record<number, string>>({})
  const [inCorso, setInCorso] = useState<number[]>([])
  const [daTogliere, setDaTogliere] = useState<number | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  // Fino al primo giro nel browser vale lo stato calcolato dal server: cosi' server e browser scrivono lo stesso.
  const [ora, setOra] = useState<number | null>(null)
  useEffect(() => {
    setOra(Date.now())
    const t = setInterval(() => setOra(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  const stato = ora == null ? l.finestra : ora < Date.parse(l.apre_il) ? 'presto' : ora > Date.parse(l.chiude_il) ? 'chiuso' : 'aperto'
  const aperto = !soloLettura && stato === 'aperto'
  const presenti = l.prenotati.filter((p) => presenze[p.booking_id]).length

  async function cambia(ids: number[], valore: boolean) {
    setErrore(null)
    const prima = presenze
    setPresenze((x) => ({ ...x, ...Object.fromEntries(ids.map((i) => [i, valore])) }))
    setInCorso((c) => [...c, ...ids])
    const r = await segnaPresenze(ids, valore)
    setInCorso((c) => c.filter((i) => !ids.includes(i)))
    if (!r.ok) {
      setPresenze(prima)
      setErrore(r.errore)
      return
    }
    const adesso = formatoOra(new Date().toISOString())
    setMie((m) => {
      const n = { ...m }
      for (const i of ids) {
        if (valore) n[i] = adesso
        else delete n[i]
      }
      return n
    })
  }

  function tocca(p: PrenotatoAppello) {
    if (!aperto || inCorso.includes(p.booking_id)) return
    if (presenze[p.booking_id]) setDaTogliere((a) => (a === p.booking_id ? null : p.booking_id))
    else {
      setDaTogliere(null)
      void cambia([p.booking_id], true)
    }
  }

  // Chi ha segnato e quando; da PerfectGym arriva solo «c'era».
  function chiEQuando(p: PrenotatoAppello): string | null {
    if (!presenze[p.booking_id]) return null
    if (inCorso.includes(p.booking_id)) return 'salvataggio…'
    if (mie[p.booking_id]) return `tu ${mie[p.booking_id]}`
    if (!p.segnato_il) return 'tornello/PG'
    return `${breve(p.segnato_da)} ${formatoOra(p.segnato_il)}`
  }

  const dettagliRiga = (p: PrenotatoAppello) => {
    const chi = chiEQuando(p)
    return (
      <span className="appello-persona">
        <span className="appello-nome">
          {soloLettura && p.utente_id ? (
            <Link href={`/dashboard/persone/${p.utente_id}`} target="_blank" rel="noopener noreferrer">
              {nomeCompleto(p)}
            </Link>
          ) : (
            nomeCompleto(p)
          )}
        </span>
        <span className="appello-dettagli">
          {p.data_nascita && (
            <span title={`Nato il ${formatoData(p.data_nascita)}`}>
              {formatoData(p.data_nascita)} · {eta(p.data_nascita) ?? '—'} anni
            </span>
          )}
          <Segnali p={p} />
          {chi && <span>{chi}</span>}
        </span>
      </span>
    )
  }

  return (
    <section className="scheda appello-lezione" id={`lezione-${l.class_id}`}>
      <div className="appello-testa">
        <div>
          <div className="appello-ora">
            {formatoOra(l.inizio)}
            {l.fine ? `–${formatoOra(l.fine)}` : ''}
          </div>
          <h3 className="appello-titolo">{l.lezione ?? 'Lezione'}</h3>
          <div className="piccolo attenuato">
            {[l.sala, soloLettura ? (l.istruttore ?? 'nessun istruttore') : null, l.posti ? `${l.posti} posti` : null].filter(Boolean).join(' · ')}
          </div>
          {!soloLettura && stato === 'aperto' && <span className="bollino verde">Appello aperto fino alle {formatoOra(l.chiude_il)}</span>}
          {!soloLettura && stato === 'presto' && <span className="bollino giallo">Si segna dalle {formatoOra(l.apre_il)}</span>}
          {!soloLettura && stato === 'chiuso' && <span className="bollino grigio">Appello chiuso alle {formatoOra(l.chiude_il)}</span>}
        </div>
        <div className="appello-conto">
          <strong>
            {presenti}/{l.prenotati.length}
          </strong>
          <span className="piccolo attenuato">presenti</span>
        </div>
      </div>

      {l.prenotati.length === 0 ? (
        <p className="vuoto">Nessun prenotato.</p>
      ) : (
        <ul className="appello-elenco">
          {l.prenotati.map((p) => {
            const si = Boolean(presenze[p.booking_id])
            const classe = `appello-riga${si ? ' si' : ''}${inCorso.includes(p.booking_id) ? ' attesa' : ''}`
            const marca = (
              <>
                <span className="appello-check" aria-hidden="true">
                  {si ? '✓' : ''}
                </span>
                {dettagliRiga(p)}
                {aperto && <span className={`appello-azione${si ? ' fatto' : ''}`}>{si ? '✓ Presente' : 'Segna presente'}</span>}
              </>
            )
            return (
              <li key={p.booking_id}>
                {aperto ? (
                  <button
                    type="button"
                    className={classe}
                    aria-pressed={si}
                    aria-label={si ? `${nomeCompleto(p)}: presente. Tocca per togliere la presenza` : `Segna presente ${nomeCompleto(p)}`}
                    onClick={() => tocca(p)}
                  >
                    {marca}
                  </button>
                ) : (
                  <div className={classe}>{marca}</div>
                )}
                {daTogliere === p.booking_id && (
                  <div className="appello-conferma" role="alertdialog">
                    <span>Togliere la presenza di {nomeCompleto(p)}?</span>
                    <button
                      type="button"
                      className="bottone piccolo"
                      onClick={() => {
                        setDaTogliere(null)
                        void cambia([p.booking_id], false)
                      }}
                    >
                      Sì, togli
                    </button>
                    <button type="button" className="bottone secondario piccolo" onClick={() => setDaTogliere(null)}>
                      Annulla
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {errore && (
        <p className="piccolo" role="alert" style={{ color: 'var(--rosso)', marginTop: 8 }}>
          {errore}
        </p>
      )}
    </section>
  )
}
