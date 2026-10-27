import Link from 'next/link'
import { crm, richiediSezione } from '@/lib/crm'
import { Vuoto } from '@/components/Ui'
import { TabellaLead } from '@/components/TabellaLead'
import { TabellaProve } from '@/components/TabellaProve'
import { TabellaContratti } from '@/components/VistaContratti'

// «Nessun consulente»: i lead senza assegnatario (uuid a zero per crm_lead).
const NESSUN_CONSULENTE = '00000000-0000-0000-0000-000000000000'

// Senza consulente: le opportunita' aperte, le prove in corso e i contratti nuovi che nessun consulente
// ha ancora in carico. Si arriva dal riquadro della Dashboard consulente; ogni elenco e' quello della
// sua sezione, qui riunito (Opportunita', Prove, Contratti senza consulente).
export default async function SenzaConsulente() {
  const io = await richiediSezione('lead')
  const [prove, liberi, contratti, staff] = await Promise.all([
    crm.prove('in_corso'),
    crm.lead('tutte', null, null, NESSUN_CONSULENTE),
    crm.iscrizioni('da_assegnare'),
    crm.staff(),
  ])
  // Dei lead solo quelli ancora aperti, delle prove quelle che nessuno segue.
  const leadLiberi = liberi.filter((l) => l.fase === 'da_gestire' || l.fase === 'in_gestione')
  const proveLibere = prove.filter((p) => !p.gestito_da && !p.esito)
  const pagamenti = await crm.pagamenti(proveLibere.map((p) => p.contract_id))
  const qui = '/dashboard/senza-consulente'

  return (
    <>
      <div className="testata">
        <div>
          <div className="titolo-riga">
            <h1>Senza consulente</h1>
            <span className="aiuto-titolo" tabIndex={0} role="note" aria-label="Cos'è questa sezione">
              <span className="aiuto-punto" aria-hidden="true">?</span>
              <span className="aiuto-testo">
                Quello che nessun consulente ha ancora in carico: le opportunità aperte, le prove in corso e i contratti nuovi. Ogni elenco è quello della sua sezione, qui riunito
                per prenderlo in carico subito.
              </span>
            </span>
          </div>
        </div>
      </div>

      <section className="scheda" id="senza-consulente">
        <div className="da-gestire-corpo">
          <div className="na-toggle">
            <input type="radio" name="na-vista" id="na-v-opp" className="task-radio" defaultChecked />
            <input type="radio" name="na-vista" id="na-v-prove" className="task-radio" />
            <input type="radio" name="na-vista" id="na-v-contr" className="task-radio" />
            <div className="task-tabs na-tabs">
              <label htmlFor="na-v-opp">Opportunità senza consulente <span>{leadLiberi.length}</span></label>
              <label htmlFor="na-v-prove">Prove in corso senza consulente <span>{proveLibere.length}</span></label>
              <label htmlFor="na-v-contr">Contratti senza consulente <span>{contratti.length}</span></label>
            </div>
            <div className="na-pannello na-opp">
              {leadLiberi.length === 0 ? <Vuoto>Nessuna opportunità senza consulente.</Vuoto> : <TabellaLead lead={leadLiberi.slice(0, 50)} io={io} staff={staff} torna={qui} />}
              <p className="piccolo attenuato"><Link href="/dashboard/lead?vista=da_gestire">Tutte le opportunità da gestire →</Link></p>
            </div>
            <div className="na-pannello na-prove">
              {proveLibere.length === 0 ? <Vuoto>Nessuna prova senza consulente.</Vuoto> : <TabellaProve prove={proveLibere.slice(0, 50)} pagamenti={pagamenti} staff={staff} torna={qui} />}
              <p className="piccolo attenuato"><Link href="/dashboard/prove?vista=in_corso">Tutte le prove in corso →</Link></p>
            </div>
            <div className="na-pannello na-contr">
              {contratti.length === 0 ? <Vuoto>Nessun contratto da prendere in carico.</Vuoto> : <TabellaContratti righe={contratti.slice(0, 50)} io={io} staff={staff} qui={qui} />}
              <p className="piccolo attenuato"><Link href="/dashboard/contratti-senza-consulente">Tutti i contratti senza consulente →</Link></p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
