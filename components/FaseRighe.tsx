// Una fase della scheda cliente (Lead, Prova, Abbonamento, Rinnovo, Disdetta): titolo scuro
// attaccato e, sotto, i dati in colonne tematiche. Solo presentazione.
export function Fase({ numero, nome, piede, children }: { numero?: number; nome: string; piede?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={`fase-righe${piede ? ' con-piede' : ''}`}>
      <div className="fase-titolo">
        {numero != null && <span className="fase-numero">{numero}</span>}
        {nome}
      </div>
      <section className="scheda fase-corpo">{children}</section>
      {piede}
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
export function Accordion({ titolo, anteprima, azione, aperto = false, classe = '', corpoClasse = '', children }: { titolo: React.ReactNode; anteprima?: React.ReactNode; azione?: React.ReactNode; aperto?: boolean; classe?: string; corpoClasse?: string; children: React.ReactNode }) {
  return (
    <details className={`fase-righe sotto-fase task-fase ${classe}`} open={aperto}>
      <summary className="fase-titolo">
        {titolo}
        {azione}
        <span className="task-apri" aria-hidden="true" />
        {anteprima && <span className="acc-anteprima">{anteprima}</span>}
      </summary>
      <section className={`scheda fase-corpo sotto-corpo ${corpoClasse}`}>{children}</section>
    </details>
  )
}

// «Storico ...» (opportunita', prove, abbonamenti passati): una barra scura a fisarmonica; aperta, sotto ci sono le schede di prima.
export function Storico({ numero, titolo, conta, cosa, aperto = false, children }: { numero: number; titolo: string; conta: number; cosa: [string, string]; aperto?: boolean; children: React.ReactNode }) {
  return (
    <details className="storico-acc" open={aperto}>
      <summary className="fase-titolo">
        <span className="fase-numero">{numero}</span>
        {titolo}
        <span className="chip-gruppo"><span className="chip">{conta} {conta === 1 ? cosa[0] : cosa[1]}</span></span>
        <span className="task-apri" aria-hidden="true" />
      </summary>
      <div className="storico-lista">{children}</div>
    </details>
  )
}

// Lo storico attaccato in fondo alla fase (dentro la stessa scheda): una barra scura a fisarmonica, aperta mostra le voci chiuse.
export function StoricoPiede({ conta, cosa, children }: { conta: number; cosa: [string, string]; children: React.ReactNode }) {
  return (
    <details className="fase-storico">
      <summary>
        <span className="fase-storico-nome">Storico</span>
        <span className="chip">{conta} {conta === 1 ? cosa[0] : cosa[1]}</span>
        <span className="task-apri" aria-hidden="true" />
      </summary>
      <div className="fase-storico-lista">{children}</div>
    </details>
  )
}
