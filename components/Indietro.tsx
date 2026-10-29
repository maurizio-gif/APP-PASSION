'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

// «Torna a ...» nelle pagine di dettaglio (scheda cliente, ticket, guida, riunioni, nuovo lead...):
// una riga discreta sopra il titolo, con il nome della pagina da cui si e' arrivati.
// Nelle sezioni principali non c'e': ci si muove dal menu.
const NOMI: Record<string, string> = {
  lead: 'Opportunità', prove: 'Prove', disdette: 'Disdette', rinnovi: 'Rinnovi', task: 'Task', cerca: 'Cerca',
  debitori: 'Debitori', abbonamenti: 'Abbonamenti', ticket: 'Ticket', curriculum: 'Curriculum',
  utenti: 'Utenti', riunioni: 'Report riunioni', guida: 'Guida', aggiornamenti: 'Aggiornamenti', contratti: 'Contratti',
}

function nome(percorso: string, radice: string) {
  const parti = percorso.split('/').filter(Boolean)
  if (parti[0] !== radice || parti.length === 1) return 'Da gestire'
  if (parti[1] === 'persone' || parti[1] === 'persona') return 'Scheda cliente'
  return NOMI[parti[1]] ?? 'Indietro'
}

// Il dettaglio e' una pagina sotto una sezione (/dashboard/ticket/12, /dashboard/persone/xx, /dashboard/lead/nuovo).
const eDettaglio = (percorso: string, radice: string) => {
  const parti = percorso.split('/').filter(Boolean)
  return parti[0] === radice && (parti.length >= 3 || parti[1] === 'persona')
}

// Dove va inserita la riga, secondo com'e' fatta la testata della pagina.
const DOVE = ['.testata:not(:has(.testata-saluto)) .titolo-riga h1', '.testata-ticket', '.persona-testa .persona-chi', '.testata:not(:has(.testata-saluto)) > div:first-child']

export function Indietro() {
  const percorso = usePathname() ?? ''
  const router = useRouter()
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  const [da, setDa] = useState<string | null>(null)
  const radice = percorso.startsWith('/anteprima') ? 'anteprima' : 'dashboard'

  useEffect(() => {
    // pagina precedente: la ricordo per tutta la sessione (anche dopo un ricarico)
    let prec: string | null = null
    try {
      const corrente = sessionStorage.getItem('crm-corrente')
      if (corrente && corrente !== percorso) prec = corrente
      else prec = sessionStorage.getItem('crm-precedente')
      sessionStorage.setItem('crm-precedente', prec ?? '')
      sessionStorage.setItem('crm-corrente', percorso)
    } catch {}
    setDa(prec || null)

    const home = percorso === `/${radice}` || percorso === `/${radice}/`
    if (home) return void setSlot(null)
    // La pagina puo' arrivare a pezzi (scheletro di caricamento, poi i dati): si prova a montare il tondino
    // finche' la testata c'e', e lo si rimonta se la testata viene sostituita. Dopo qualche secondo si smette.
    let nodo: HTMLSpanElement | null = null
    let attesa = 0
    const tenta = () => {
      attesa = 0
      if (nodo && nodo.isConnected) return
      nodo?.remove()
      nodo = null
      // se la testata ha gia' il suo «← ...», non si ripete
      if ([...document.querySelectorAll('.testata a, .testata-ticket a')].some((a) => (a.textContent ?? '').trim().startsWith('←'))) return void setSlot(null)
      const dove = DOVE.map((s) => document.querySelector<HTMLElement>(s)).find(Boolean)
      if (!dove) return void setSlot(null)
      nodo = document.createElement('span')
      nodo.className = 'crumb-slot'
      dove.prepend(nodo)
      setSlot(nodo)
    }
    tenta()
    const osservatore = new MutationObserver(() => {
      if (!attesa) attesa = requestAnimationFrame(tenta)
    })
    osservatore.observe(document.body, { childList: true, subtree: true })
    const fine = window.setTimeout(() => osservatore.disconnect(), 10000)
    return () => {
      osservatore.disconnect()
      window.clearTimeout(fine)
      if (attesa) cancelAnimationFrame(attesa)
      nodo?.remove()
      setSlot(null)
    }
  }, [percorso, radice])

  if (!slot) return null
  const padre = percorso.split('/').filter(Boolean).slice(0, 2).join('/')
  const profonda = percorso.split('/').filter(Boolean).length >= 3 && !percorso.includes('/persone/')
  const verso = da && da !== percorso ? da : profonda ? `/${padre}` : `/${radice}`
  const etichetta = nome(verso, radice)
  return createPortal(
    <button
      type="button"
      className="crumb-indietro"
      aria-label={`Torna a ${etichetta}`}
      data-label={`Torna a ${etichetta}`}
      onClick={() => {
        if (da && window.history.length > 1) router.back()
        else router.push(verso)
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
    </button>,
    slot,
  )
}
