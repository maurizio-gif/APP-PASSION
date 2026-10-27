import type { PrenotatoAppello } from '@/lib/crm'
import { formatoData } from '@/lib/formato'

// I tre segnali dell'appello, come nel CRM Athlon: chi e' in prova, chi e'
// appena arrivato e chi e' alla prima volta a quella lezione sono le persone
// da seguire meglio. Le regole stanno nel database (20261027k_appello_segnali.sql).
export function Segnali({ p }: { p: Pick<PrenotatoAppello, 'prima_volta' | 'prova_piano' | 'prova_fine' | 'primo_abbonamento'> }) {
  return (
    <>
      {p.prova_piano && (
        <span
          className="appello-segnale appello-segnale-prova"
          title={`${p.prova_piano.replace(/^[#^* ]+/, '')}${p.prova_fine ? ` · fino al ${formatoData(p.prova_fine)}` : ''}`}
        >
          Prova
        </span>
      )}
      {p.primo_abbonamento && (
        <span className="appello-segnale appello-segnale-nuovo" title={`Primo abbonamento dal ${formatoData(p.primo_abbonamento)}`}>
          Nuovo iscritto
        </span>
      )}
      {p.prima_volta && (
        <span className="appello-segnale appello-segnale-prima" title="È la sua prima volta a questo tipo di lezione">
          First Timer
        </span>
      )}
    </>
  )
}

// La legenda, sotto il titolo: le stesse pastiglie delle righe, e cosa vuol dire ognuna.
export function LegendaSegnali() {
  return (
    <ul className="appello-legenda" aria-label="Legenda dei segnali">
      <li>
        <span className="appello-segnale appello-segnale-prova">Prova</span>
        <span>ha un Guest Pass (7 o 10 giorni) in corso</span>
      </li>
      <li>
        <span className="appello-segnale appello-segnale-nuovo">Nuovo iscritto</span>
        <span>nelle prime due settimane del primo abbonamento</span>
      </li>
      <li>
        <span className="appello-segnale appello-segnale-prima">First Timer</span>
        <span>prima volta a questo tipo di lezione</span>
      </li>
    </ul>
  )
}
