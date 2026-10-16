import type { Pagamento, Prova } from '@/lib/crm'
import { formatoData, formatoFa } from '@/lib/formato'
import { BollinoFonte, Contatti, Persona } from '@/components/Ui'
import { BollinoPagamento } from '@/components/Bollini'

// Le iniziali in un cerchio, accanto al nome.
export function Iniziali({ nome, cognome, classe = '' }: { nome: string | null; cognome: string | null; classe?: string }) {
  const testo = ((nome?.trim()[0] ?? '') + (cognome?.trim()[0] ?? '')).toUpperCase() || '?'
  return <span className={`iniziali ${classe}`} aria-hidden="true">{testo}</span>
}

// Quanto del pass e' gia' passato: una barra, verde, gialla negli ultimi giorni,
// rossa l'ultimo giorno. Solo per le prove ancora aperte con le date.
function Avanzamento({ p }: { p: Prova }) {
  if (p.esito || !p.data_inizio || !p.data_fine || p.giorni_rimasti == null || p.giorni_rimasti < 0) return null
  const durata = Math.max(1, Math.round((new Date(p.data_fine).getTime() - new Date(p.data_inizio).getTime()) / 86400000))
  const fatto = Math.min(1, Math.max(0, (durata - p.giorni_rimasti) / durata))
  const colore = p.giorni_rimasti === 0 ? 'rosso' : p.giorni_rimasti <= 3 ? 'giallo' : 'verde'
  return (
    <div className="avanzamento-pass">
      <div className={`avanzamento ${colore}`}><span style={{ width: `${Math.round(fatto * 100)}%` }} /></div>
      <span className={`avanzamento-testo ${colore}`}>{p.giorni_rimasti === 0 ? 'finisce oggi' : `${p.giorni_rimasti} gg`}</span>
    </div>
  )
}

// Una riga della tabella Prove. Il modulo dell'esito arriva da fuori
// (`children`), cosi' la riga resta solo da guardare.
export function RigaProva({ p, pagamento, children }: { p: Prova; pagamento?: Pagamento | null; children: React.ReactNode }) {
  return (
    <tr>
      <td>
        <div className="cella-persona">
          <Iniziali nome={p.nome} cognome={p.cognome} />
          <div>
            <Persona id={p.utente_id} nome={p.nome} cognome={p.cognome} />
            <Contatti telefono={p.telefono} email={p.email} />
            <div className="cella-etichette">
              <BollinoFonte fonte={p.fonte} dettaglio={p.fonte_dettaglio} />
              {p.gestito_nome ? (
                <span className="cella-consulente" title="Chi la segue">
                  <Iniziali nome={p.gestito_nome.split(' ')[0] ?? null} cognome={p.gestito_nome.split(' ')[1] ?? null} classe="piccole" />
                  {p.gestito_nome}
                </span>
              ) : (
                <span className="bollino giallo">da assegnare</span>
              )}
            </div>
          </div>
        </div>
      </td>
      <td className="piccolo">
        <div className="cella-pass">
          <strong>{p.tipo_pass ?? '—'}</strong>
          <div className="attenuato nowrap">{formatoData(p.data_inizio)} → {formatoData(p.data_fine)}</div>
          <Avanzamento p={p} />
          {p.contract_id != null && <BollinoPagamento p={pagamento} />}
        </div>
      </td>
      <td className="piccolo">
        <div className="metriche">
          <div className={`metrica${p.ingressi === 0 ? ' zero' : ''}`}>
            <strong>{p.ingressi}</strong>
            <span>ingressi</span>
          </div>
          <div className="metrica">
            <strong>{p.presenze}<small>/{p.prenotazioni}</small></strong>
            <span>lezioni fatte</span>
          </div>
        </div>
        <div className="attenuato">{p.ultimo_ingresso ? `ultimo ingresso ${formatoFa(p.ultimo_ingresso)}` : 'mai entrato'}</div>
        {p.iscritto_su_pgm && !p.esito && <span className="bollino verde">ha già un contratto su PerfectGym</span>}
      </td>
      <td className="gestisci">{children}</td>
    </tr>
  )
}

