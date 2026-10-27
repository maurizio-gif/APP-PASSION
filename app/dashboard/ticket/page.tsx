import Link from 'next/link'
import { crm, richiediSezione, type ResocontoMese } from '@/lib/crm'
import { NATURA_TICKET, traduci } from '@/lib/formato'
import { assiste, smista } from '@/lib/permessi'
import { type GruppoSchede, Avviso, LinkGuida, Schede, Vuoto } from '@/components/Ui'
import { TabellaTicket } from '@/components/Ticket'
import { filtraTicket, testoCercato } from '@/lib/ricerca'

const VUOTI: Record<string, string> = {
  da_verificare: 'Nessuna segnalazione da verificare.',
  r2d: 'Nessun ticket aperto da R2D.',
  in_attesa: 'R2D non aspetta risposte da Passion.',
  modifiche: 'Nessuna modifica da confermare o da rilasciare.',
  miei: 'Non hai ticket aperti.',
  chiusi: 'Nessun ticket chiuso negli ultimi 90 giorni.',
}

// I ticket di assistenza: il desk scrive, il supporto verifica e manda a R2D,
// R2D lavora e chiude con causa e soluzione. Le modifiche le scrive R2D dopo
// la riunione settimanale col titolare.
export default async function Ticket({ searchParams }: { searchParams: { vista?: string; errore?: string; q?: string } }) {
  const io = await richiediSezione('ticket')
  const conti = await crm.ticketConti()
  const viste = [
    // R2D (superadmin) non vede i ticket finche' il supporto non glieli invia: la scheda «Da verificare» non c'e'.
    ...(assiste(io) ? [] : [{ chiave: 'da_verificare', testo: 'Da verificare', n: conti.da_verificare, gruppo: 'lavoro' }]),
    { chiave: 'r2d', testo: 'Per R2D', n: conti.r2d, gruppo: 'lavoro' },
    { chiave: 'in_attesa', testo: 'Per Passion', n: conti.in_attesa, gruppo: 'lavoro' },
    { chiave: 'modifiche', testo: 'Modifiche', n: conti.modifiche_da_confermare + conti.modifiche_da_rilasciare, gruppo: 'modifiche' },
    { chiave: 'miei', testo: 'Aperti da me', n: conti.miei, gruppo: 'tuoi' },
    { chiave: 'chiusi', testo: 'Chiusi', gruppo: 'archivio' },
    { chiave: 'resoconto', testo: 'Resoconto', gruppo: 'archivio' },
  ]
  const gruppi: GruppoSchede[] = [
    { chiave: 'lavoro', testo: 'Da lavorare', tono: 'lavoro' },
    { chiave: 'tuoi', testo: 'Per te', tono: 'prova' },
  { chiave: 'modifiche', testo: 'Proposte', tono: 'lavoro' },
    { chiave: 'archivio', testo: 'Archivio', tono: 'chiusi' },
  ]
  const predefinita = assiste(io) ? 'r2d' : smista(io) ? 'da_verificare' : 'miei'
  const vista = viste.some((v) => v.chiave === searchParams.vista) ? searchParams.vista! : predefinita
  const q = testoCercato(searchParams.q)

  return (
    <>
      <div className="testata">
        <div>
          <div className="titolo-riga">
            <h1>Ticket</h1>
            <span className="aiuto-titolo" tabIndex={0} role="note" aria-label="Cos'è questa sezione">
              <span className="aiuto-punto" aria-hidden="true">?</span>
              <span className="aiuto-testo">Le segnalazioni del desk arrivano al supporto, che le verifica, risponde o le manda a R2D.
            Se qualcosa blocca tutti (tornello, app giù, pagamenti), chiama anche R2D.{' '}<LinkGuida argomento="ticket" /></span>
            </span>
          </div>
        </div>
        <div className="azioni-riga">
          {assiste(io) && <Link className="bottone secondario" href="/dashboard/ticket/modifica">+ Nuova modifica</Link>}
          <Link className="bottone" href="/dashboard/ticket/nuovo">+ Nuovo ticket</Link>
        </div>
      </div>
      <Avviso errore={searchParams.errore} />
      {conti.bloccanti > 0 && (
        <p className="avviso">{conti.bloccanti === 1 ? 'C’è un ticket aperto che blocca il lavoro.' : `Ci sono ${conti.bloccanti} ticket aperti che bloccano il lavoro.`}</p>
      )}
      <Schede voci={viste} attiva={vista} base="/dashboard/ticket" gruppi={gruppi} />

      {vista !== 'resoconto' && (
        <form className="filtri" action="/dashboard/ticket">
          <input type="hidden" name="vista" value={vista} />
          <input type="search" name="q" defaultValue={q ?? ''} placeholder="Numero, titolo, cliente, chi l'ha aperto" aria-label="Cerca nei ticket" />
          <button className="bottone secondario" type="submit">Cerca</button>
        </form>
      )}

      {vista === 'resoconto' ? <Resoconto mesi={await crm.ticketResoconto(6)} /> : <Elenco vista={vista} q={q} />}
    </>
  )
}

async function Elenco({ vista, q }: { vista: string; q: string | null }) {
  const ticket = filtraTicket(await crm.ticketElenco(vista), q)
  return (
    <div className="scheda">
      {ticket.length === 0 ? <Vuoto>{q ? `Nessun ticket trovato per «${q}» in questa scheda.` : VUOTI[vista] ?? 'Nessun ticket.'}</Vuoto> : <TabellaTicket ticket={ticket} />}
    </div>
  )
}

// Il resoconto mensile: le stesse categorie dell'analisi dei ticket, per
// vedere nella riunione se le regole si stanno assestando.
function Resoconto({ mesi }: { mesi: ResocontoMese[] }) {
  const nome = (m: string) => new Date(`${m}-15T12:00:00Z`).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
  return (
    <div className="scheda">
      <p className="piccolo attenuato">Aperti: le segnalazioni del mese per tipo, senza le modifiche. Chiusi: risolti da R2D o al desk, per natura. Ore: la mediana dall’invio a R2D alla soluzione.</p>
      <div className="tabella-scorre">
        <table className="resoconto-ticket">
          <thead>
            <tr>
              <th>Mese</th>
              <th className="num">Aperti</th>
              <th className="num">Guasti</th>
              <th className="num">Domande</th>
              <th className="num">Attività</th>
              <th className="num">Proposte</th>
              <th className="num">Chiusi</th>
              <th className="num">Al desk</th>
              <th className="num">Uniti</th>
              <th className="num">Modifiche rilasciate</th>
              <th>Di che cosa si trattava</th>
              <th className="num">Ore</th>
            </tr>
          </thead>
          <tbody>
            {mesi.map((m) => (
              <tr key={m.mese}>
                <td className="nowrap">{nome(m.mese)}</td>
                <td className="num">{m.aperti}</td>
                <td className="num">{m.per_tipo.guasto ?? 0}</td>
                <td className="num">{m.per_tipo.domanda ?? 0}</td>
                <td className="num">{m.per_tipo.attivita ?? 0}</td>
                <td className="num">{m.per_tipo.proposta ?? 0}</td>
                <td className="num">{m.chiusi}</td>
                <td className="num">{m.al_desk}</td>
                <td className="num">{m.doppioni}</td>
                <td className="num">{m.modifiche_rilasciate}</td>
                <td className="piccolo">
                  {Object.entries(m.per_natura).sort((a, b) => b[1] - a[1]).map(([k, n]) => (
                    <div key={k}>{traduci(NATURA_TICKET, k)}: <strong>{n}</strong></div>
                  ))}
                  {Object.keys(m.per_natura).length === 0 && <span className="attenuato">—</span>}
                </td>
                <td className="num">{m.ore_mediane ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
