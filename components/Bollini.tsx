import { STATO_CONTRATTO, TIPO_SOCIO, formatoData, formatoEuro, traduci } from '@/lib/formato'
import type { Pagamento } from '@/lib/crm'

export function BollinoContratto({ stato }: { stato: string | null | undefined }) {
  if (!stato) return <span className="bollino">Nessun contratto</span>
  const colore = stato === 'Current' ? 'verde' : stato === 'NotStarted' ? 'giallo' : ''
  return <span className={`bollino ${colore}`}>{traduci(STATO_CONTRATTO, stato)}</span>
}

export function BollinoTipo({ tipo }: { tipo: string | null | undefined }) {
  const colore = tipo === 'Member' ? 'verde' : tipo === 'Lead' ? 'giallo' : ''
  return <span className={`bollino ${colore}`}>{traduci(TIPO_SOCIO, tipo)}</span>
}

// Il contratto e' pagato? Da pagare se c'e' un addebito scaduto non ancora saldato.
export function BollinoPagamento({ p }: { p: Pagamento | null | undefined }) {
  if (!p) return null
  if (p.scaduto > 0) {
    return <span className="bollino rosso" title={p.scaduto_dal ? `scaduto dal ${formatoData(p.scaduto_dal)}` : undefined}>Da pagare {formatoEuro(p.scaduto)}</span>
  }
  if (p.pagato > 0 || p.addebiti > 0) return <span className="bollino verde">Pagato</span>
  return <span className="bollino grigio">Nessun addebito</span>
}

// Il dettaglio per la scheda: pagato, ultimo pagamento, da pagare, saldo del socio.
export function DatiPagamento({ p }: { p: Pagamento | null | undefined }) {
  if (!p) return null
  return (
    <>
      <dt>Pagamento</dt>
      <dd>
        <BollinoPagamento p={p} />
        {p.scaduto > 0 && p.scaduto_dal ? <span className="piccolo attenuato"> dal {formatoData(p.scaduto_dal)}</span> : null}
      </dd>
      <dt>Pagato</dt>
      <dd>{formatoEuro(p.pagato)}{p.ultimo_pagamento ? <span className="piccolo attenuato"> · ultimo il {formatoData(p.ultimo_pagamento)}</span> : null}</dd>
      {p.da_pagare_futuro > 0 && (
        <>
          <dt>Prossimo addebito</dt>
          <dd>{formatoEuro(p.da_pagare_futuro)}{p.prossima_scadenza ? <span className="piccolo attenuato"> · il {formatoData(p.prossima_scadenza)}</span> : null}</dd>
        </>
      )}
      <dt>Saldo socio</dt>
      <dd className={p.saldo != null && p.saldo < 0 ? 'negativo' : undefined}>{formatoEuro(p.saldo)}</dd>
    </>
  )
}
