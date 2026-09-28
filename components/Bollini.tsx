import { STATO_CONTRATTO, TIPO_SOCIO, traduci } from '@/lib/formato'

export function BollinoContratto({ stato }: { stato: string | null | undefined }) {
  if (!stato) return <span className="bollino">Nessun contratto</span>
  const colore = stato === 'Current' ? 'verde' : stato === 'NotStarted' ? 'giallo' : ''
  return <span className={`bollino ${colore}`}>{traduci(STATO_CONTRATTO, stato)}</span>
}

export function BollinoTipo({ tipo }: { tipo: string | null | undefined }) {
  const colore = tipo === 'Member' ? 'verde' : tipo === 'Lead' ? 'giallo' : ''
  return <span className={`bollino ${colore}`}>{traduci(TIPO_SOCIO, tipo)}</span>
}
