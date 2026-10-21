import type { Pagamento, Prova } from '@/lib/crm'
import { formatoData, formatoFa } from '@/lib/formato'
import { Contatti, Persona } from '@/components/Ui'
import { BollinoPagamento } from '@/components/Bollini'

// Le iniziali in un cerchio (solo nell'intestazione della scheda persona).
export function Iniziali({ nome, cognome, classe = '' }: { nome: string | null; cognome: string | null; classe?: string }) {
  const testo = ((nome?.trim()[0] ?? '') + (cognome?.trim()[0] ?? '')).toUpperCase() || '?'
  return <span className={`iniziali ${classe}`} aria-hidden="true">{testo}</span>
}

// Quanto manca alla fine del pass, a parole: rosso l'ultimo giorno, giallo
// negli ultimi tre, verde dopo. Niente per le prove chiuse o senza date.
function StatoPass({ p }: { p: Prova }) {
  if (p.esito || p.giorni_rimasti == null || p.giorni_rimasti < 0) return null
  const g = p.giorni_rimasti
  const colore = g <= 3 ? 'rosso' : 'giallo'
  const testo = g === 0 ? 'Finisce oggi' : `${g} gg`
  return <span className={`stato ${colore}`}>{testo}</span>
}

// Una riga della tabella Prove: ogni cella e' una colonna di righe, una sotto
// l'altra, tutte della stessa dimensione (la prima in grassetto, le altre grigie).
// Il modulo dell'esito arriva da fuori (`children`).
export function RigaProva({ p, pagamento, etichette, children }: { p: Prova; pagamento?: Pagamento | null; etichette?: React.ReactNode; children: React.ReactNode }) {
  return (
    <tr>
      <td>
        <div className="cliente-cella">
<Iniziali nome={p.nome} cognome={p.cognome} classe="piccole" />
<div className="riga-dati">
          <Persona id={p.utente_id} nome={p.nome} cognome={p.cognome} />
          <Contatti telefono={p.telefono} email={p.email} />
          {p.gestito_nome ? (
            <span className="muto">segue {p.gestito_nome}</span>
          ) : (
            <span className="muto">nessuno la segue</span>
          )}
        </div>
</div>
      </td>
      <td>
        <div className="riga-dati">
          <strong>{p.tipo_pass ?? '—'}</strong>
          <span className="muto nowrap">{formatoData(p.data_inizio)} → {formatoData(p.data_fine)}</span>
          <StatoPass p={p} />
          {p.contract_id != null && <span className="etichetta-riga"><BollinoPagamento p={pagamento} /></span>}
        </div>
      </td>
      <td>
        <div className="riga-dati">
          <span><strong>{p.ingressi}</strong> ingressi</span>
          <span><strong>{p.prenotazioni}</strong> lezioni prenotate · {p.presenze} fatte</span>
          {p.ultimo_ingresso && <span className="muto">Ultimo ingresso {formatoFa(p.ultimo_ingresso)}</span>}
          {p.ingressi === 0 && <span className="stato rosso">Mai entrato</span>}
          {p.iscritto_su_pgm && !p.esito && <span className="etichetta-riga"><span className="bollino verde">ha già un contratto su PerfectGym</span></span>}
          {etichette && <span className="etichetta-riga">{etichette}</span>}
        </div>
      </td>
      <td>
        <div className="riga-dati">
          {p.obiezione ? <span className="normale">{p.obiezione}</span> : <span className="muto">–</span>}
          {p.note && <span className="muto">{p.note}</span>}
          {p.task_aperti > 0 && <span className="muto">{p.task_aperti} {p.task_aperti === 1 ? 'task aperto' : 'task aperti'}</span>}
        </div>
      </td>
      <td className="gestisci">{children}</td>
    </tr>
  )
}
