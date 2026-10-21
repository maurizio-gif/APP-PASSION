'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

// «Indietro» in ogni pagina (tranne la home): torna alla pagina da cui si e' arrivati.
// Se la pagina e' stata aperta da sola (nuova scheda del browser, niente cronologia)
// porta alla sezione. Se la pagina ha gia' un suo «← ...» nella testata, non si ripete.
function sezione(percorso: string, radice: string) {
  const parti = percorso.split('/').filter(Boolean)
  if (parti.length <= 1) return `/${radice}`
  if (parti[1] === 'persone') return `/${radice}`
  return `/${parti.slice(0, 2).join('/')}`
}

export function Indietro() {
  const percorso = usePathname() ?? ''
  const router = useRouter()
  const [nascosto, setNascosto] = useState(false)
  const radice = percorso.startsWith('/anteprima') ? 'anteprima' : 'dashboard'
  const home = percorso === `/${radice}` || percorso === `/${radice}/`

  useEffect(() => {
    // La testata ha gia' il suo link di ritorno («← Ticket», «← Guida»...).
    const proprio = [...document.querySelectorAll('.testata a, .testata-ticket a')].some((a) => (a.textContent ?? '').trim().startsWith('←'))
    setNascosto(proprio)
  }, [percorso])

  if (home || nascosto) return null
  return (
    <button
      type="button"
      className="indietro"
      onClick={() => {
        if (window.history.length > 1) router.back()
        else router.push(sezione(percorso, radice))
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
      Indietro
    </button>
  )
}
