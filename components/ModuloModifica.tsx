import { BottoneInvio } from '@/components/BottoneInvio'

// Il modulo di una modifica: per scriverla (Nuova modifica) e per correggerla
// finche' non e' confermata (pagina del ticket).
export function ModuloModifica({ azione, testo, riunione, valori, campiNascosti }: {
  azione: (f: FormData) => Promise<void>
  testo: string
  riunione?: string | null
  valori?: { titolo: string; descrizione: string; abbonamenti: string | null; dal: string | null; comunicazione: string | null }
  campiNascosti?: Record<string, string>
}) {
  return (
    <form action={azione} className="scheda modulo" style={{ maxWidth: 720 }}>
      {Object.entries(campiNascosti ?? {}).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <div className="campo">
        <label htmlFor="titolo">In breve</label>
        <input id="titolo" name="titolo" type="text" required maxLength={140} defaultValue={valori?.titolo}
          placeholder="Wellhub: niente Reformer e Formula 8" />
      </div>
      <div className="campo">
        <label htmlFor="descrizione">Cosa cambia</label>
        <textarea id="descrizione" name="descrizione" rows={4} required defaultValue={valori?.descrizione}
          placeholder="Com'è oggi e come sarà dopo, con i valori esatti (orari, prezzi, limiti)" />
      </div>
      <div className="due-colonne">
        <div className="campo">
          <label htmlFor="abbonamenti">Per quali abbonamenti o prodotti</label>
          <input id="abbonamenti" name="abbonamenti" type="text" defaultValue={valori?.abbonamenti ?? ''}
            placeholder="Tutti gli Under 25, Pass 7 giorni…" />
        </div>
        <div className="campo">
          <label htmlFor="dal">Da quando</label>
          <input id="dal" name="dal" type="date" defaultValue={valori?.dal ?? ''} />
        </div>
        {riunione !== undefined && (
          <div className="campo">
            <label htmlFor="riunione">Riunione</label>
            <input id="riunione" name="riunione" type="date" defaultValue={riunione ?? ''} />
          </div>
        )}
      </div>
      <div className="campo">
        <label htmlFor="comunicazione">Cosa si dice ai soci e al desk</label>
        <textarea id="comunicazione" name="comunicazione" rows={2} defaultValue={valori?.comunicazione ?? ''}
          placeholder="Testi da cambiare sul portale e sull'app, messaggio al desk, newsletter" />
      </div>
      <BottoneInvio testo={testo} inCorso="Salvataggio…" />
    </form>
  )
}
