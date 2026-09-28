'use client'

export default function Errore({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="scheda">
      <h2>Qualcosa non ha funzionato</h2>
      <p className="attenuato">{error.message || 'La lettura dal database non è riuscita.'}</p>
      <button className="bottone" onClick={reset}>
        Riprova
      </button>
    </div>
  )
}
