import { crm, richiediSezione } from '@/lib/crm'
import { Avviso, LinkGuida, Schede, Vuoto, type GruppoSchede } from '@/components/Ui'
import { FiltroConsulente, consulenteScelto } from '@/components/FiltroConsulente'
import type { FiltriDisdette } from '@/lib/crm'
import Link from 'next/link'
import { TabellaDisdette } from '@/components/TabellaDisdette'

const GRUPPI: GruppoSchede[] = [
  { chiave: 'lavoro', testo: 'Da lavorare', tono: 'lavoro' },
  { chiave: 'chiusi', testo: 'Chiuse', tono: 'chiusi' },
]
const VISTE = [
  { chiave: 'da_gestire', testo: 'Da gestire', gruppo: 'lavoro' },
  { chiave: 'in_gestione', testo: 'In gestione', gruppo: 'lavoro' },
  { chiave: 'mie', testo: 'Le mie', gruppo: 'lavoro' },
  { chiave: 'gestite', testo: 'Gestite', gruppo: 'chiusi' },
  { chiave: 'tutte', testo: 'Tutte' },
]

const ORDINI: { chiave: NonNullable<FiltriDisdette['ordine']>; testo: string }[] = [
  { chiave: 'scadenza_asc', testo: 'Scadenza: prima le più vicine' },
  { chiave: 'scadenza_desc', testo: 'Scadenza: prima le più lontane' },
  { chiave: 'disdetta_desc', testo: 'Disdetta: prima le più recenti' },
  { chiave: 'disdetta_asc', testo: 'Disdetta: prima le più vecchie' },
]
const giorno = (v: string | undefined) => (v && /^d{4}-d{2}-d{2}$/.test(v) ? v : null)

// Le disdette: quando su PerfectGym compare la data di disdetta di un
// contratto, arriva qui. Si prende in carico come un lead e si chiama il socio
// per provare a recuperarlo; l'esito si scrive nella sua scheda.
export default async function Disdette({ searchParams }: {
  searchParams: { vista?: string; consulente?: string; errore?: string; q?: string; ordine?: string; scad_da?: string; scad_a?: string; disd_da?: string; disd_a?: string }
}) {
  const io = await richiediSezione('disdette')
  const vista = VISTE.some((v) => v.chiave === searchParams.vista) ? searchParams.vista! : 'da_gestire'
  const staff = await crm.staff()
  // Il consulente: chi segue la disdetta.
  const consulente = consulenteScelto(staff, searchParams.consulente)
  const testo = searchParams.q?.trim() || null
  const ordine = ORDINI.find((o) => o.chiave === searchParams.ordine)?.chiave ?? null
  const scadDa = giorno(searchParams.scad_da)
  const scadA = giorno(searchParams.scad_a)
  const disdDa = giorno(searchParams.disd_da)
  const disdA = giorno(searchParams.disd_a)
  const disdette = await crm.disdette(vista, consulente, { testo, ordine, scadenzaDa: scadDa, scadenzaA: scadA, disdettaDa: disdDa, disdettaA: disdA })
  // Ricerca, date e ordine restano passando da una scheda all'altra e dopo aver preso in carico.
  const resto = new URLSearchParams()
  for (const [k, v] of Object.entries({ consulente, q: testo, ordine, scad_da: scadDa, scad_a: scadA, disd_da: disdDa, disd_a: disdA })) if (v) resto.set(k, v)
  const perFiltri = resto.toString()
  const qui = `/dashboard/disdette?vista=${vista}${perFiltri ? `&${perFiltri}` : ''}`
  const conFiltri = Boolean(testo || ordine || scadDa || scadA || disdDa || disdA)

  return (
    <>
      <div className="testata">
        <div>
          <div className="titolo-riga">
            <h1>Disdette</h1>
            <span className="aiuto-titolo" tabIndex={0} role="note" aria-label="Cos'è questa sezione">
              <span className="aiuto-punto" aria-hidden="true">?</span>
              <span className="aiuto-testo">Chi ha disdetto su PerfectGym: si prende in carico, poi una telefonata o un appuntamento per capire il motivo e recuperarlo. L&apos;esito si scrive nella scheda. Una disdetta è definitiva: se c&apos;è un nuovo abbonamento che dà continuità (parte entro il giorno dopo la fine del vecchio) è un cambio abbonamento e non compare qui.{' '}<LinkGuida argomento="disdette" /></span>
            </span>
          </div>
        </div>
      </div>
      <Avviso errore={searchParams.errore} />
      <Schede voci={VISTE} attiva={vista} base={`/dashboard/disdette${perFiltri ? `?${perFiltri}` : ''}`} gruppi={GRUPPI} />
      <FiltroConsulente azione="/dashboard/disdette" staff={staff} consulente={consulente} tieni={{ vista }} q={testo} classe="filtri-largo">
        <select name="ordine" defaultValue={ordine ?? ''} aria-label="Ordina">
          <option value="">Ordine: ultime arrivate</option>
          {ORDINI.map((o) => <option key={o.chiave} value={o.chiave}>{o.testo}</option>)}
        </select>
        <span className="a-capo" aria-hidden="true" />
        <div className="intervallo" role="group" aria-label="Scadenza">
          <span>Scadenza dal</span>
          <input type="date" name="scad_da" defaultValue={scadDa ?? ''} aria-label="Scadenza dal" />
          <span>al</span>
          <input type="date" name="scad_a" defaultValue={scadA ?? ''} aria-label="Scadenza al" />
        </div>
        <div className="intervallo" role="group" aria-label="Disdetta">
          <span>Disdetta dal</span>
          <input type="date" name="disd_da" defaultValue={disdDa ?? ''} aria-label="Disdetta dal" />
          <span>al</span>
          <input type="date" name="disd_a" defaultValue={disdA ?? ''} aria-label="Disdetta al" />
        </div>
        {(conFiltri || consulente) && <Link href={`/dashboard/disdette?vista=${vista}`}>Azzera</Link>}
      </FiltroConsulente>

      <div className="scheda">
        {disdette.length === 0 ? (
          <Vuoto>{conFiltri || consulente ? 'Nessuna disdetta con questi filtri.' : 'Nessuna disdetta qui.'}</Vuoto>
        ) : (
          <TabellaDisdette disdette={disdette} io={io} staff={staff} torna={qui} />
        )}
        <p className="piccolo attenuato conteggio">{disdette.length} {disdette.length === 1 ? 'disdetta' : 'disdette'}</p>
      </div>
    </>
  )
}
