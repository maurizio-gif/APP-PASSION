'use client'

import { useEffect, useState } from 'react'

// Tema chiaro o scuro: di partenza e' chiaro; la scelta resta in questo browser (nessun dato esce dal computer).
export function CambiaTema() {
  const [chiaro, setChiaro] = useState(false)
  useEffect(() => setChiaro(document.documentElement.getAttribute('data-tema') === 'chiaro'), [])

  const cambia = () => {
    const nuovo = !chiaro
    setChiaro(nuovo)
    if (nuovo) document.documentElement.setAttribute('data-tema', 'chiaro')
    else document.documentElement.removeAttribute('data-tema')
    try {
      localStorage.setItem('tema', nuovo ? 'chiaro' : 'scuro')
    } catch {}
  }

  return (
    <button
      type="button"
      className="cambia-tema"
      onClick={cambia}
      aria-label={chiaro ? 'Passa al tema scuro' : 'Passa al tema chiaro'}
      title={chiaro ? 'Tema scuro' : 'Tema chiaro'}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {chiaro ? (
          <path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z" />
        ) : (
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4M12 8a4 4 0 100 8 4 4 0 000-8z" />
        )}
      </svg>
    </button>
  )
}
