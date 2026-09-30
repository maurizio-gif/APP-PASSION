import Link from 'next/link'
import { crm, richiediSezione, type Scheda } from '@/lib/crm'
import { formatoData, formatoEuro, oggiRoma, STATI_TICKET_CHIUSI, TIPI_TICKET_NUOVI, VERIFICHE_TICKET } from '@/lib/formato'
import { smista } from '@/lib/permessi'
import { Avviso } from '@/components/Ui'
import { BottoneInvio } from '@/components/BottoneInvio'
import { NumeroTicket } from '@/components/Ticket'
import { nuovoTicket } from '../../azioni'

// Aprire un ticket. Dalla scheda di un socio arriva `persona`: il ticket si
// porta dietro la sua situazione (abbonamento, saldo, certificato), e qui la
// si vede prima di scrivere, con i ticket gia' aperti su di lui.
export default async function NuovoTicket({ searchParams }: { searchParams: { persona?: string; tipo?: string; errore?: string } }) {
  const io = await richiediSezione('ticket')
  const scheda = searchParams.persona ? await crm.persona(searchParams.persona) : null
  const aperti = scheda
    ? (await crm.ticketElenco('tutti', scheda.persona.id)).filter((t) => !STATI_TICKET_CHIUSI.includes(t.stato))
    : []
  const tipo = TIPI_TICKET_NUOVI.some((t) => t.chiave === searchParams.tipo) ? searchParams.tipo : 'guasto'
  const nome = scheda ? [scheda.persona.nome, scheda.persona.cognome].filter(Boolean).join(' ') || 'Senza nome' : null

  return (
    <>
      <div className="testata">
        <div>
          <h1>Nuovo ticket{nome ? ` per ${nome}` : ''}</h1>
          <p>{smista(io)
            ? 'Lo mandi subito a R2D. Le proposte di modifica restano per la riunione settimanale.'
            : 'Arriva a chi smista i ticket: lo verifica, ti risponde o lo manda a R2D.'}</p>
        </div>
        <Link href={scheda ? `/dashboard/persone/${scheda.persona.id}` : '/dashboard/ticket'}>← {scheda ? 'Scheda' : 'Ticket'}</Link>
      </div>
      <Avviso errore={searchParams.errore} />

      {aperti.length > 0 && (
        <div className="avviso">
          <p>Su questa persona ci sono già ticket aperti. Se è lo stesso problema, scrivi lì invece di aprirne uno nuovo:</p>
          <ul className="elenco-breve">
            {aperti.map((t) => (
              <li key={t.id}><Link href={`/dashboard/ticket/${t.id}`}><NumeroTicket id={t.id} /> {t.titolo}</Link></li>
            ))}
          </ul>
        </div>
      )}

      <div className="griglia ticket-nuovo">
        <form action={nuovoTicket} className="scheda modulo">
          {scheda && <input type="hidden" name="persona" value={scheda.persona.id} />}
          <fieldset className="scelta-tipo">
            <legend>Che cosa serve</legend>
            {TIPI_TICKET_NUOVI.map((t) => (
              <label key={t.chiave} className="scelta-tipo-voce">
                <input type="radio" name="tipo" value={t.chiave} defaultChecked={t.chiave === tipo} required />
                <span><strong>{t.testo}</strong><span className="piccolo attenuato">{t.spiega}</span></span>
              </label>
            ))}
          </fieldset>
          <div className="campo">
            <label htmlFor="titolo">In breve</label>
            <input id="titolo" name="titolo" type="text" required maxLength={140}
              placeholder="Non genera il QR code, non prenota il Reformer delle 18…" />
          </div>
          <div className="campo">
            <label htmlFor="descrizione">Cosa succede</label>
            <textarea id="descrizione" name="descrizione" rows={5} required
              placeholder="Cosa hai visto, da quando, cosa compare sullo schermo, cosa hai già provato" />
          </div>
          <fieldset className="verifiche">
            <legend>Per un guasto: cosa hai già controllato</legend>
            {Object.entries(VERIFICHE_TICKET).map(([k, v]) => (
              <label key={k} className="spunta"><input type="checkbox" name="verifiche" value={k} /> {v}</label>
            ))}
          </fieldset>
          <label className="spunta">
            <input type="checkbox" name="bloccante" /> Blocca il lavoro di tutti (tornello, app giù, pagamenti): chiama anche R2D
          </label>
          <BottoneInvio testo="Apri il ticket" inCorso="Invio…" />
          <p className="piccolo attenuato">Foto, video e PDF si aggiungono subito dopo, nella pagina del ticket.</p>
        </form>

        <aside>
          {scheda ? <Situazione s={scheda} /> : (
            <div className="scheda">
              <h2>Riguarda un socio?</h2>
              <p className="piccolo">Cercalo in alto e apri il ticket dalla sua scheda. Il ticket si porterà dietro abbonamento, saldo,
                certificato e ultimi ingressi, e R2D non dovrà chiederteli.</p>
            </div>
          )}
        </aside>
      </div>
    </>
  )
}

// La situazione che resterà nel ticket: le stesse cose della checklist.
function Situazione({ s }: { s: Scheda }) {
  const socio = s.socio
  if (!socio) {
    return (
      <div className="scheda">
        <h2>Non è su PerfectGym</h2>
        <p className="piccolo">Questa persona non è un socio: il ticket non avrà abbonamento, saldo e certificato.</p>
      </div>
    )
  }
  const oggi = oggiRoma()
  const [abb] = socio.contratti
  const scadenza = socio.certificato?.scadenza ?? null
  return (
    <div className="scheda">
      <h2>Cosa vede R2D</h2>
      <dl className="dati">
        <dt>Abbonamento</dt>
        <dd>{abb ? <>{abb.piano ?? '—'}<br /><span className="piccolo attenuato">dal {formatoData(abb.data_inizio)} al {formatoData(abb.data_fine)}</span>
          {abb.data_inizio && abb.data_inizio > oggi && <><br /><span className="bollino rosso">non ancora iniziato</span></>}</> : 'nessuno'}</dd>
        <dt>Saldo</dt>
        <dd className={socio.saldo != null && socio.saldo < 0 ? 'negativo' : undefined}>{formatoEuro(socio.saldo)}</dd>
        <dt>Certificato</dt>
        <dd>{!scadenza ? 'non presente' : scadenza >= oggi ? `valido fino al ${formatoData(scadenza)}` : <span className="testo-rosso">scaduto il {formatoData(scadenza)}</span>}</dd>
        <dt>Ingressi</dt>
        <dd>{socio.ingressi_30gg} negli ultimi 30 giorni</dd>
      </dl>
    </div>
  )
}
