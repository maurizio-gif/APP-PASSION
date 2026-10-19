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
