import { crm, richiediSezione } from '@/lib/crm'
import { ESITO_DISDETTA, formatoData, formatoEuro, traduci } from '@/lib/formato'
import { Avviso, Contatti, LinkGuida, Persona, Schede, Vuoto } from '@/components/Ui'
import { consulenteScelto } from '@/components/FiltroConsulente'
import type { FiltriDisdette } from '@/lib/crm'
import Link from 'next/link'
import { InCarico } from '@/components/InCarico'
import { assegnaDisdetta, rilasciaDisdetta } from '../azioni'

const VISTE = [
  { chiave: 'da_gestire', testo: 'Da gestire' },
  { chiave: 'in_gestione', testo: 'In gestione' },
  { chiave: 'mie', testo: 'Le mie' },
  { chiave: 'gestite', testo: 'Gestite' },
  { chiave: 'tutte', testo: 'Tutte' },
]

const ORDINI: { chiave: NonNullable<FiltriDisdette['ordine']>; testo: string }[] = [
  { chiave: 'scadenza_asc', testo: 'Scadenza: prima le più vicine' },
  { chiave: 'scadenza_desc', testo: 'Scadenza: prima le più lontane' },
  { chiave: 'disdetta_desc', testo: 'Disdetta: prima le più recenti' },
  { chiave: 'disdetta_asc', testo: 'Disdetta: prima le più vecchie' },
]
const giorno = (v: string | undefined) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null)

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
          <h1>Disdette</h1>
          <p>Chi ha disdetto su PerfectGym: si prende in carico, poi una telefonata o un appuntamento per capire il motivo e recuperarlo. L&apos;esito si scrive nella scheda. Una disdetta è definitiva: se c&apos;è un nuovo abbonamento che dà continuità (parte entro il giorno dopo la fine del vecchio) è un cambio abbonamento e non compare qui.{' '}<LinkGuida argomento="disdette" /></p>
        </div>
      </div>
      <Avviso errore={searchParams.errore} />
      <Schede voci={VISTE} attiva={vista} base={`/dashboard/disdette${perFiltri ? `?${perFiltri}` : ''}`} />
      <form className="filtri" action="/dashboard/disdette">
        <input type="hidden" name="vista" value={vista} />
        <input type="search" name="q" defaultValue={testo ?? ''} placeholder="Nome e cognome, cellulare, email" aria-label="Cerca una persona" />
        <select name="consulente" defaultValue={consulente ?? ''} aria-label="Consulente">
          <option value="">Tutti i consulenti</option>
          {staff.map((o) => <option key={o.id} value={o.id}>{o.nome} {o.cognome ?? ''}</option>)}
        </select>
        <select name="ordine" defaultValue={ordine ?? ''} aria-label="Ordina">
          <option value="">Ordine: ultime arrivate</option>
          {ORDINI.map((o) => <option key={o.chiave} value={o.chiave}>{o.testo}</option>)}
        </select>
        <label className="piccolo attenuato">Scadenza dal <input type="date" name="scad_da" defaultValue={scadDa ?? ''} /></label>
        <label className="piccolo attenuato">al <input type="date" name="scad_a" defaultValue={scadA ?? ''} /></label>
        <label className="piccolo attenuato">Disdetta dal <input type="date" name="disd_da" defaultValue={disdDa ?? ''} /></label>
        <label className="piccolo attenuato">al <input type="date" name="disd_a" defaultValue={disdA ?? ''} /></label>
        <button className="bottone secondario" type="submit">Filtra</button>
        {(conFiltri || consulente) && <Link href={`/dashboard/disdette?vista=${vista}`}>Azzera</Link>}
      </form>

      <div className="scheda">
        {disdette.length === 0 ? (
          <Vuoto>{conFiltri || consulente ? 'Nessuna disdetta con questi filtri.' : 'Nessuna disdetta qui.'}</Vuoto>
        ) : (
          <>
          <p className="piccolo attenuato">{disdette.length} {disdette.length === 1 ? 'disdetta' : 'disdette'}</p>
          <div className="tabella-scorre">
            <table className="schede-mobile">
              <thead>
                <tr>
                  <th>Socio</th>
                  <th>Contratto</th>
                  <th>In carico</th>
                </tr>
              </thead>
              <tbody>
                {disdette.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <Persona id={d.utente_id} nome={d.nome} cognome={d.cognome} nuovaScheda />
                      <Contatti telefono={d.telefono} email={d.email} />
                      {d.esito && (
                        <span className={`bollino ${d.esito === 'vinto' ? 'verde' : d.esito === 'perso' ? 'grigio' : 'giallo'}`}>
                          {traduci(ESITO_DISDETTA, d.esito)}
                        </span>
                      )}
                      {d.gestito_il && <div className="piccolo attenuato">{d.gestito_nome ?? '—'} · {formatoData(d.gestito_il)}</div>}
                    </td>
                    <td className="piccolo info">
                      <div><strong>{d.piano ?? '—'}</strong> · {formatoEuro(d.canone)}</div>
                      <div className="attenuato">firmato {formatoData(d.data_firma)}</div>
                      <div>scade il <strong>{formatoData(d.data_fine)}</strong></div>
                      <div>disdetto il <strong>{formatoData(d.data_disdetta)}</strong></div>
                    </td>
                    <td className="nowrap">
                      <InCarico id={d.id} assegnatoA={d.gestito_da} assegnatoNome={d.gestito_nome}
                        aperto={!d.esito || d.esito === 'standby'} io={io} staff={staff} torna={qui}
                        assegna={assegnaDisdetta} rilascia={rilasciaDisdetta} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </>
  )
}
