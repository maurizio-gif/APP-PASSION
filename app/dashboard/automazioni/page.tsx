import { crm, richiediSezione } from '@/lib/crm'
import type { Automazione, OpzioniAutomazioni } from '@/lib/crm'
import { formatoDataOra } from '@/lib/formato'
import { Avviso } from '@/components/Ui'
import { BottoneInvio } from '@/components/BottoneInvio'
import { salvaAutomazione } from '../azioni'

const ABBONAMENTO = [
  { chiave: 'attivo', testo: 'Ha un abbonamento vero attivo adesso' },
  { chiave: 'mai', testo: 'Non ha mai avuto un abbonamento' },
  { chiave: 'nessuno_attivo', testo: 'Non ha un abbonamento attivo adesso' },
  { chiave: 'non_controllare', testo: 'Non controllare l’abbonamento' },
]
const LEZIONI = [
  { chiave: 'nessuna', testo: 'Non ha prenotato nessuna lezione di questa categoria' },
  { chiave: 'almeno_una', testo: 'Ha prenotato almeno una lezione di questa categoria' },
  { chiave: 'non_controllare', testo: 'Non controllare le prenotazioni' },
]

function ModuloAutomazione({ a, opzioni, stima }: { a: Automazione; opzioni: OpzioniAutomazioni; stima: { persone_30_giorni: number; al_giorno: number } | null }) {
  const p = a.parametri
  return (
    <section className="scheda">
      <h2>{a.nome}</h2>
      <p className="piccolo attenuato sotto-titolo">
        {a.descrizione} Quando una persona rispetta queste regole, nasce un’azione per gli istruttori, in <strong>Azioni istruttore</strong>.
        Un cambio vale per le azioni nuove: quelle già create restano come sono.
      </p>
      <form action={salvaAutomazione} className="modulo">
        <input type="hidden" name="automazione" value={a.chiave} />
        <label className="spunta">
          <input type="checkbox" name="attiva" defaultChecked={a.attiva} /> Automazione accesa
        </label>

        <div className="utente-gruppo">
          <div className="utente-etichetta">Quando nasce l’azione</div>
          <div className="utente-riga">
            <label className="campo-breve">
              Giorni dopo l’iscrizione
              <input type="number" name="giorni" min={0} max={60} step={1} defaultValue={p.giorni} required />
            </label>
            <label className="campo-breve">
              Guarda gli iscritti dal
              <input type="date" name="iscritti_dal" defaultValue={p.iscritti_dal} required />
            </label>
          </div>
          <p className="piccolo attenuato">
            L’iscrizione è la data in cui la persona è stata creata su Perfect Gym. «Guarda gli iscritti dal» evita che arrivi tutto lo storico: contano solo gli iscritti da quel giorno in poi.
          </p>
        </div>

        <div className="utente-gruppo">
          <div className="utente-etichetta">Abbonamento</div>
          <label className="campo-breve">
            La persona…
            <select name="abbonamento" defaultValue={p.abbonamento}>
              {ABBONAMENTO.map((o) => <option key={o.chiave} value={o.chiave}>{o.testo}</option>)}
            </select>
          </label>
          <details>
            <summary>
              <strong>Piani che non contano come abbonamento</strong> <span className="attenuato">· {p.piani_esclusi.length} scelti</span>
            </summary>
            <p className="piccolo attenuato">
              Pass, prove e Guest Pass non contano mai. Qui scegli gli altri piani da ignorare, per esempio Wellhub, Gympass e Fitprime: chi ha solo quelli è come se non avesse un abbonamento.
            </p>
            <div className="spunte">
              {opzioni.piani.map((pi) => (
                <label key={pi.id} className="chip">
                  <input type="checkbox" name="piani_esclusi" value={pi.id} defaultChecked={p.piani_esclusi.includes(pi.id)} />
                  <span>{pi.nome}</span>
                </label>
              ))}
            </div>
          </details>
        </div>

        <div className="utente-gruppo">
          <div className="utente-etichetta">Lezioni</div>
          <div className="utente-riga">
            <label className="campo-breve">
              Categoria di lezione
              <select name="categoria_lezione" defaultValue={p.categoria_lezione ?? ''}>
                <option value="">Nessuna</option>
                {opzioni.categorie.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </label>
            <label className="campo-breve">
              La persona…
              <select name="lezioni" defaultValue={p.lezioni}>
                {LEZIONI.map((o) => <option key={o.chiave} value={o.chiave}>{o.testo}</option>)}
              </select>
            </label>
          </div>
          <p className="piccolo attenuato">Le lezioni annullate e quelle in lista d’attesa non contano come prenotate.</p>
        </div>

        <div className="utente-piede">
          <span className="piccolo attenuato">
            {a.aggiornato_da_nome ? `Ultima modifica: ${a.aggiornato_da_nome}, ${formatoDataOra(a.aggiornato_il)}` : 'Impostazioni di partenza, mai modificate'}
          </span>
          <BottoneInvio testo="Salva" inCorso="Salvo…" />
        </div>
      </form>

      <p className="piccolo attenuato">
        Finora: {a.azioni_create} {a.azioni_create === 1 ? 'azione creata' : 'azioni create'}, {a.azioni_aperte} ancora aperte.
        {stima && (
          <> Con le regole salvate sarebbero circa <strong>{String(stima.al_giorno).replace('.', ',')} al giorno</strong> ({stima.persone_30_giorni} persone fra gli iscritti degli ultimi 30 giorni, guardando la situazione di oggi).</>
        )}
      </p>
    </section>
  )
}

// Le impostazioni delle automazioni (20261110a): i valori che decidono quando nasce un'azione per lo staff.
// Oggi: i giorni dopo l'iscrizione, da quando guardare gli iscritti, che abbonamento conta e quale categoria
// di lezione si controlla. Si cambiano qui, senza toccare altro.
export default async function Automazioni({ searchParams }: { searchParams: { errore?: string; ok?: string } }) {
  await richiediSezione('automazioni')
  const [automazioni, opzioni] = await Promise.all([crm.automazioni(), crm.opzioniAutomazioni()])
  const stime = await Promise.all(automazioni.map((a) => crm.anteprimaAutomazione(a.chiave, a.parametri).catch(() => null)))

  return (
    <>
      <div className="testata">
        <div>
          <div className="titolo-riga">
            <h1>Impostazioni automazioni</h1>
            <span className="aiuto-titolo" tabIndex={0} role="note" aria-label="Cos'è questa sezione">
              <span className="aiuto-punto" aria-hidden="true">?</span>
              <span className="aiuto-testo">Le regole delle azioni che il CRM crea da sole per lo staff: dopo quanti giorni, per chi, in base a quale abbonamento e a quali lezioni.</span>
            </span>
          </div>
        </div>
      </div>
      <Avviso errore={searchParams.errore} ok={searchParams.ok} />
      {automazioni.map((a, i) => (
        <ModuloAutomazione key={a.chiave} a={a} opzioni={opzioni} stima={stime[i]} />
      ))}
    </>
  )
}
