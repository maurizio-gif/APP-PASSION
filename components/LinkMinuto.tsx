'use client'

// Un minuto della riunione (01:50:29): apre la trascrizione, che sta chiusa
// in fondo alla pagina, e ci porta al punto in cui se ne parla.
export function LinkMinuto({ minuto, ancora }: { minuto: string; ancora: string }) {
  return (
    <a
      href={`#${ancora}`}
      className="minuto"
      title="Apri la trascrizione a questo punto"
      onClick={() => {
        const t = document.getElementById('trascrizione')
        if (t instanceof HTMLDetailsElement) t.open = true
      }}
    >
      {minuto}
    </a>
  )
}
