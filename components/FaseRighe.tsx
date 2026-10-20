// Una fase della scheda cliente (Lead, Prova, Abbonamento, Rinnovo, Disdetta): titolo scuro
// attaccato e, sotto, i dati in colonne tematiche. Solo presentazione.
export function Fase({ numero, nome, children }: { numero?: number; nome: string; children: React.ReactNode }) {
  return (
    <div className="fase-righe">
      <div className="fase-titolo">
        {numero != null && <span className="fase-numero">{numero}</span>}
        {nome}
      </div>
      <section className="scheda fase-corpo">{children}</section>
    </div>
  )
}

export function Col({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <div className="fase-col">
      <h4>{titolo}</h4>
      {children}
    </div>
  )
}

export function FaseVuota({ numero, nome, testo }: { numero?: number; nome: string; testo: string }) {
  return (
    <Fase numero={numero} nome={nome}>
      <div className="fase-vuota-righe">{testo}</div>
    </Fase>
  )
}

// Riquadro con la testata scura attaccata (Ticket e altre pagine di dettaglio).
export function Riquadro({ titolo, classe = '', children }: { titolo: React.ReactNode; classe?: string; children: React.ReactNode }) {
  return (
    <div className={`fase-righe sotto-fase ${classe}`}>
      <div className="fase-titolo">{titolo}</div>
      <section className="scheda fase-corpo sotto-corpo">{children}</section>
    </div>
  )
}

// Lo stesso riquadro a fisarmonica: la testata e' il tasto Apri / Chiudi.
export function Accordion({ titolo, aperto = false, classe = '', children }: { titolo: React.ReactNode; aperto?: boolean; classe?: string; children: React.ReactNode }) {
  return (
    <details className={`fase-righe sotto-fase task-fase ${classe}`} open={aperto}>
      <summary className="fase-titolo">
        {titolo}
        <span className="task-apri" aria-hidden="true" />
      </summary>
      <section className="scheda fase-corpo sotto-corpo">{children}</section>
    </details>
  )
}
