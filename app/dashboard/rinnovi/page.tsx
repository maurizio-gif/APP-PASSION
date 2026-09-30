import { crm, linkPgm, richiediSezione } from '@/lib/crm'
import { ESITO_RINNOVO, formatoData, formatoEuro, STATO_CONTRATTO, traduci } from '@/lib/formato'
import { Avviso, Contatti, LinkGuida, Persona, Schede, Vuoto } from '@/components/Ui'
import { FiltroConsulente, consulenteScelto } from '@/components/FiltroConsulente'
import { InCarico } from '@/components/InCarico'
import { assegnaRinnovo, rilasciaRinnovo } from '../azioni'

const VISTE = [
  { chiave: 'da_gestire', testo: 'Da gestire' },
  { chiave: 'in_gestione', testo: 'In gestione' },
  { chiave: 'mie', testo: 'I miei' },
  { chiave: 'rinnovati', testo: 'Rinnovati' },
  { chiave: 'non_rinnovati', testo: 'Non rinnovati' },
  { chiave: 'tutti', testo: 'Tutti' },
]

// I rinnovi: gli abbonamenti a scadenza fissa che finiscono, uno per contratto,
// dal mirror (20260930c). Si prendono in carico come i lead; l'esito si scrive
// nella scheda della persona, il rinnovo su PerfectGym si vede da solo.
export default async function Rinnovi({ searchParams }: { searchParams: { vista?: string; consulente?: string; errore?: string } }) {
  const io = await richiediSezione('rinnovi')
  const vista = VISTE.some((v) => v.chiave === searchParams.vista) ? searchParams.vista! : 'da_gestire'
  const staff = await crm.staff()
  // Il consulente: a chi e' assegnato il rinnovo.
  const consulente = consulenteScelto(staff, searchParams.consulente)
  const rinnovi = await crm.rinnovi(vista, consulente)
  const perConsulente = consulente ? `consulente=${consulente}` : ''
  const qui = `/dashboard/rinnovi?vista=${vista}${perConsulente ? `&${perConsulente}` : ''}`

  return (
    <>
      <div className="testata">
        <div>
          <h1>Rinnovi</h1>
          <p>Gli abbonamenti in scadenza: si prendono in carico, e l&apos;esito si scrive nella scheda. Il rinnovo su PerfectGym si vede da solo.{' '}<LinkGuida argomento="rinnovi" /></p>
        </div>
      </div>
      <Avviso errore={searchParams.errore} />
      <Schede voci={VISTE} attiva={vista} base={`/dashboard/rinnovi${perConsulente ? `?${perConsulente}` : ''}`} />
      <FiltroConsulente azione="/dashboard/rinnovi" staff={staff} consulente={consulente} tieni={{ vista }} />

      <div className="scheda">
        {rinnovi.length === 0 ? (
          <Vuoto>Nessun rinnovo qui.</Vuoto>
        ) : (
          <div className="tabella-scorre">
            <table className="schede-mobile">
              <thead>
                <tr>
                  <th>Socio</th>
                  <th>Abbonamento</th>
                  <th>In carico</th>
                </tr>
              </thead>
              <tbody>
                {rinnovi.map((r) => {
                  const pgm = linkPgm(r.member_id)
                  return (
                    <tr key={r.id}>
                      <td>
                        <Persona id={r.utente_id} nome={r.nome} cognome={r.cognome} />
                        <Contatti telefono={r.telefono} email={r.email} />
                        {r.esito && (
                          <span className={`bollino ${r.esito === 'rinnovato' ? 'verde' : 'grigio'}`}>{traduci(ESITO_RINNOVO, r.esito)}</span>
                        )}
                        {r.gestito_il && <div className="piccolo attenuato">{r.assegnato_nome ?? '—'} · {formatoData(r.gestito_il)}</div>}
                        {pgm && <a className="piccolo" href={pgm} target="_blank" rel="noreferrer">PerfectGym ↗</a>}
                      </td>
                      <td className="piccolo info">
                        <div><strong>{r.piano ?? '—'}</strong> · {formatoEuro(r.valore)}</div>
                        <div>scade il <strong>{formatoData(r.scadenza)}</strong></div>
                        {r.stato_contratto && <div className="attenuato">{traduci(STATO_CONTRATTO, r.stato_contratto)}</div>}
                        {r.rinnovato_su_pgm && <span className="bollino verde">Nuovo abbonamento su PerfectGym</span>}
                        {r.task_aperti > 0 && <div className="attenuato">{r.task_aperti} {r.task_aperti === 1 ? 'task aperto' : 'task aperti'}</div>}
                      </td>
                      <td className="nowrap">
                        <InCarico id={r.id} assegnatoA={r.assegnato_a} assegnatoNome={r.assegnato_nome}
                          aperto={!r.esito} io={io} staff={staff} torna={qui}
                          assegna={assegnaRinnovo} rilascia={rilasciaRinnovo} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
