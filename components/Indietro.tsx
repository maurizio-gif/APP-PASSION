'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

// «Torna a ...» nelle pagine di dettaglio (scheda cliente, ticket, guida, riunioni, nuovo lead...):
// una riga discreta sopra il titolo, con il nome della pagina da cui si e' arrivati.
// Nelle sezioni principali non c'e': ci si muove dal menu.
const NOMI: Record<string, string> = {
  lead: 'Lead', prove: 'Prove', disdette: 'Disdette', rinnovi: 'Rinnovi', task: 'Task', cerca: 'Cerca',
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
const DOVE = ['.testata:not(:has(.testata-saluto)) .titolo-riga h1', '.testata-ticket', '.persona-testa .persona-chi']

export function Indietro() {
  const percorso = usePathname() ?? ''
  const router = useRouter()
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  const [da, setDa] = useState<string | null>(null)
  const radice = percorso.startsWith('/anteprima') ? 'anteprima' : 'dashboard'

  // Come si e' arrivati: dal menu laterale, col browser o col nostro «Torna a» non e' un percorso da riproporre.
  useEffect(() => {
    const segna = (v: string) => { try { sessionStorage.setItem('crm-arrivo', v) } catch {} }
    const clic = (e: MouseEvent) => { if ((e.target as HTMLElement | null)?.closest('.barra a, .barra button.barra-cerca')) segna('menu') }
    const indietro = () => segna('browser')
    const invio = (e: Event) => { if ((e.target as HTMLElement | null)?.closest('.barra')) segna('menu') }
    document.addEventListener('click', clic, true)
    document.addEventListener('submit', invio, true)
    window.addEventListener('popstate', indietro)
    return () => {
      document.removeEventListener('click', clic, true)
      document.removeEventListener('submit', invio, true)
      window.removeEventListener('popstate', indietro)
    }
  }, [])

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

    let arrivo: string | null = null
    // (l'effetto puo' girare due volte sulla stessa pagina: l'esito resta legato al percorso)
    try {
      const segnato = sessionStorage.getItem('crm-arrivo')
      if (segnato) {
        arrivo = segnato
        sessionStorage.setItem('crm-esito', JSON.stringify({ p: percorso, a: segnato }))
        sessionStorage.removeItem('crm-arrivo')
      } else {
        const esito = JSON.parse(sessionStorage.getItem('crm-esito') ?? 'null')
        if (esito && esito.p === percorso) arrivo = esito.a
      }
    } catch {}
    const home = percorso === `/${radice}` || percorso === `/${radice}/`
    // Nelle sezioni principali solo se ci si arriva da un'altra pagina con un collegamento (non dal menu).
    const daAltraPagina = !!prec && !arrivo && prec !== percorso
    if (home || !(eDettaglio(percorso, radice) || daAltraPagina)) return void setSlot(null)
    // se la testata ha gia' il suo «← ...», non si ripete
    if ([...document.querySelectorAll('.testata a, .testata-ticket a')].some((a) => (a.textContent ?? '').trim().startsWith('←'))) return void setSlot(null)
    const dove = DOVE.map((s) => document.querySelector<HTMLElement>(s)).find(Boolean)
    if (!dove) return void setSlot(null)
    const nodo = document.createElement('span')
    nodo.className = 'crumb-slot'
    dove.prepend(nodo)
    setSlot(nodo)
    return () => {
      nodo.remove()
      setSlot(null)
    }
  }, [percorso, radice])

  if (!slot) return null
  const padre = percorso.split('/').filter(Boolean).slice(0, 2).join('/')
  const verso = da && da !== percorso ? da : percorso.includes('/persone/') ? `/${radice}` : `/${padre}`
  const etichetta = nome(verso, radice)
  return createPortal(
    <button
      type="button"
      className="crumb-indietro"
      aria-label={`Torna a ${etichetta}`}
      data-label={`Torna a ${etichetta}`}
      onClick={() => {
        try { sessionStorage.setItem('crm-arrivo', 'browser') } catch {}
        if (da && window.history.length > 1) router.back()
        else router.push(verso)
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
    </button>,
    slot,
  )
}
