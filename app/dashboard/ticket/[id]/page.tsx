import Link from 'next/link'
import { notFound } from 'next/navigation'
import { crm, linkPgm, richiediSezione, type Io, type Ticket } from '@/lib/crm'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  EVENTO_TICKET, formatoData, formatoDataOra, NATURA_TICKET, STATI_TICKET_CHIUSI, traduci, VERIFICHE_TICKET,
} from '@/lib/formato'
import { assiste, smista } from '@/lib/permessi'
import { Avviso, Contatti, Persona } from '@/components/Ui'
import { BottoneInvio } from '@/components/BottoneInvio'
import { CaricaAllegati } from '@/components/CaricaAllegati'
import { ModuloModifica } from '@/components/ModuloModifica'
import { BollinoStato, BollinoTipo, NumeroTicket } from '@/components/Ticket'
import {
  annullaModifica, aggiornaModifica, chiediTicket, confermaModifica, inviaTicket, messaggioTicket, prendiTicket,
  riapriTicket, rilasciaModifica, risolviTicket, risolviTicketDesk, unisciTicket,
} from '../../azioni'

// La natura proposta a chi risolve al desk, secondo il tipo.
const NATURA_DESK: Record<string, string> = {
  guasto: 'funziona_come_impostato', domanda: 'domanda', attivita: 'attivita', proposta: 'richiesta_modifica',
}

export default async function PaginaTicket({ params, searchParams }: { params: { id: string }; searchParams: { errore?: string; ok?: string } }) {
  const io = await richiediSezione('ticket')
  const id = Number(params.id)
  if (!Number.isInteger(id) || id <= 0) notFound()
  const t = await crm.ticket(id)
  if (!t) notFound()
  const qui = `/dashboard/ticket/${t.id}`
  const link = await linkAllegati(t)
  const chiuso = STATI_TICKET_CHIUSI.includes(t.stato)

  return (
    <>
      <div className="testata">
        <div className="testata-ticket">
          <div className="ticket-riga-sopra">
            <span className="ticket-sopra">Ticket <NumeroTicket id={t.id} /></span>
            <div className="ticket-bollini">
              <BollinoTipo tipo={t.tipo} /> <BollinoStato stato={t.stato} />
              {t.bloccante && <span className="bollino rosso blocca">Blocca il lavoro</span>}
            </div>
          </div>
          <h1>{t.titolo}</h1>
          <ul className="ticket-meta">
            <li><span>Aperto da</span> <strong>{t.aperto_da_nome ?? '—'}</strong> · {formatoDataOra(t.aperto_il)}</li>
            {t.inviato_il && (
              <li>
                <span>Mandato a R2D</span> {formatoDataOra(t.inviato_il)}
                {t.inviato_nome && t.inviato_nome !== t.aperto_da_nome && <> · da <strong>{t.inviato_nome}</strong></>}
              </li>
            )}
            {t.preso_nome && <li><span>Lo segue</span> <strong>{t.preso_nome}</strong></li>}
          </ul>
        </div>
        <Link className="bottone secondario" href="/dashboard/ticket">← Ticket</Link>
      </div>
      <Avviso errore={searchParams.errore} ok={searchParams.ok} />
      {t.doppione_di && (
        <p className="avviso">Unito al <Link href={`/dashboard/ticket/${t.doppione_di}`}>#{t.doppione_di}</Link>: si segue lì.</p>
      )}
      {t.stato === 'in_attesa' && (
        <p className="avviso">R2D aspetta una risposta di Passion: scrivila nel thread qui sotto e il ticket torna in lavorazione.</p>
      )}

      <div className="griglia ticket-pagina">
        <section className="scheda">
          <h2>{t.tipo === 'modifica' ? 'Cosa cambia' : 'Cosa succede'}</h2>
          <p className="ticket-testo">{t.descrizione}</p>
          {t.tipo === 'modifica' && (
            <dl className="dati">
              <dt>Per</dt><dd>{t.abbonamenti ?? <span className="attenuato">non indicato</span>}</dd>
              <dt>Da quando</dt><dd>{t.dal ? formatoData(t.dal) : <span className="attenuato">non indicato</span>}</dd>
              <dt>Comunicazione</dt><dd>{t.comunicazione ?? <span className="attenuato">nessuna</span>}</dd>
              <dt>Riunione</dt><dd>{formatoData(t.riunione)}</dd>
              {t.confermata_il && (<><dt>Conferma</dt><dd>{t.confermata_nota} <span className="piccolo attenuato">(registrata da {t.confermata_nome} il {formatoDataOra(t.confermata_il)})</span></dd></>)}
            </dl>
          )}
          {t.tipo !== 'modifica' && t.verifiche.length > 0 && (
            <>
              <h3 className="titoletto">Già controllato</h3>
              <ul className="elenco-breve">{t.verifiche.map((v) => <li key={v}>✓ {traduci(VERIFICHE_TICKET, v)}</li>)}</ul>
            </>
          )}
        </section>

        {(t.persona || t.doppioni.length > 0 || t.stessa_persona.length > 0) && (
          <section className="scheda">
            <h2>Cliente</h2>
            {t.persona && (
              <>
                <div className="cliente-riga">
                  <Persona id={t.persona.id} nome={t.persona.nome} cognome={t.persona.cognome} />
                  {linkPgm(t.persona.member_id) && (
                    <a className="bottone secondario piccolo" href={linkPgm(t.persona.member_id)!} target="_blank" rel="noreferrer">Apri su PerfectGym ↗</a>
                  )}
                </div>
                <Contatti telefono={t.persona.telefono} email={t.persona.email} />
              </>
            )}
            {t.stessa_persona.length > 0 && (
              <>
                <h3 className="titoletto">Altri ticket aperti sul cliente</h3>
                <ul className="elenco-breve">
                  {t.stessa_persona.map((o) => (
                    <li key={o.id}><Link href={`/dashboard/ticket/${o.id}`}><NumeroTicket id={o.id} /> {o.titolo}</Link> <BollinoStato stato={o.stato} /></li>
                  ))}
                </ul>
              </>
            )}
            {t.doppioni.length > 0 && (
              <>
                <h3 className="titoletto">Uniti a questo</h3>
                <ul className="elenco-breve">
                  {t.doppioni.map((d) => (
                    <li key={d.id}><Link href={`/dashboard/ticket/${d.id}`}><NumeroTicket id={d.id} /> {d.titolo}</Link>
                      <span className="piccolo attenuato"> · {d.aperto_da_nome}, {formatoData(d.aperto_il)}</span></li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}
        {(t.soluzione || t.causa) && (
          <section className="scheda ticket-soluzione piena">
            <h2>{t.stato === 'rilasciata' ? 'Rilasciata' : 'Soluzione'}</h2>
            <dl className="dati">
              {t.natura && (<><dt>Di cosa si trattava</dt><dd>{traduci(NATURA_TICKET, t.natura)}</dd></>)}
              {t.causa && (<><dt>Causa</dt><dd className="ticket-testo">{t.causa}</dd></>)}
              <dt>{t.stato === 'rilasciata' ? 'Verificato' : t.stato === 'risolto_desk' ? 'Risposta del desk' : 'Soluzione'}</dt>
              <dd className="ticket-testo">{t.soluzione}</dd>
              {t.chiuso_il && (<><dt>Chiuso</dt><dd>{t.chiuso_nome} · {formatoDataOra(t.chiuso_il)}</dd></>)}
            </dl>
          </section>
        )}

        <section className="scheda">
          <details className="accordion" open={t.allegati.length > 0}>
            <summary>
              <h2>Allegati <span className={`conta-titolo${t.allegati.length === 0 ? ' zero' : ''}`}>{t.allegati.length}</span></h2>
            </summary>
              {t.allegati.length === 0 ? (
                <p className="vuoto">Nessun allegato.</p>
              ) : (
                <ul className="allegati-elenco">
                  {t.allegati.map((a) => {
                    const url = link.get(a.percorso)
                    const immagine = a.tipo?.startsWith('image/') && a.tipo !== 'image/heic' && a.tipo !== 'image/heif'
                    return (
                      <li key={a.id}>
                        {url ? (
                          <a href={url} target="_blank" rel="noreferrer">
                            {immagine ? <img src={url} alt={a.nome} loading="lazy" /> : <span className="allegato-file">{a.nome}</span>}
                          </a>
                        ) : <span className="allegato-file attenuato">{a.nome} (non raggiungibile)</span>}
                        <div className="piccolo attenuato">{a.caricato_nome} · {formatoDataOra(a.caricato_il)}</div>
                      </li>
                    )
                  })}
                </ul>
              )}
              {t.stato !== 'doppione' && <CaricaAllegati ticket={t.id} />}
          </details>
        </section>

        <section className="scheda">
          <details className="accordion">
            <summary>
              <h2>Thread <span className="conta-titolo">{t.messaggi.filter((m) => !m.evento).length}</span></h2>
            </summary>
              <ul className="filo-ticket">
                {t.messaggi.map((m) => (
                  <li key={m.id} className={`lato-${m.lato}${m.evento ? ' evento' : ''}`}>
                    <div className="storia-testa">
                      <strong>{m.autore ?? '—'}</strong>{m.lato === 'r2d' && <span className="bollino grigio">R2D</span>}
                      {m.evento && <> {traduci(EVENTO_TICKET, m.evento)}</>} · {formatoDataOra(m.creato_il)}
                    </div>
                    {m.testo && <div className="storia-testo">{m.testo}</div>}
                  </li>
                ))}
              </ul>
              {t.stato !== 'doppione' && (
                <form action={messaggioTicket} className="modulo">
                  <input type="hidden" name="ticket" value={t.id} />
                  <input type="hidden" name="torna" value={qui} />
                  <div className="campo">
                    <label htmlFor="testo">Scrivi</label>
                    <textarea id="testo" name="testo" rows={3} required placeholder={chiuso ? 'Un aggiornamento (il ticket resta chiuso)' : 'Una risposta, un aggiornamento, un dettaglio in più'} />
                  </div>
                  <BottoneInvio testo="Aggiungi al thread" inCorso="Invio…" classe="secondario" />
                </form>
              )}
          </details>
        </section>

        <Azioni t={t} io={io} qui={qui} />
      </div>
    </>
  )
}

// I link firmati (un'ora) per gli allegati: il bucket e' privato.
async function linkAllegati(t: Ticket) {
  const mappa = new Map<string, string>()
  if (t.allegati.length === 0) return mappa
  const supabase = createSupabaseServerClient()
  const { data } = await supabase.storage.from('ticket').createSignedUrls(t.allegati.map((a) => a.percorso), 3600)
  for (const d of data ?? []) if (d.path && d.signedUrl) mappa.set(d.path, d.signedUrl)
  return mappa
}

function Nascosti({ t, qui }: { t: Ticket; qui: string }) {
  return (
    <>
      <input type="hidden" name="ticket" value={t.id} />
      <input type="hidden" name="torna" value={qui} />
    </>
  )
}

function SceltaNatura({ predefinita }: { predefinita?: string }) {
  return (
    <select name="natura" defaultValue={predefinita ?? ''} required aria-label="Di cosa si trattava">
      <option value="" disabled>Di cosa si trattava…</option>
      {Object.entries(NATURA_TICKET).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
    </select>
  )
}

// Cosa si puo' fare adesso, secondo chi e' entrato e lo stato del ticket.
function Azioni({ t, io, qui }: { t: Ticket; io: Io; qui: string }) {
  const puoSmistare = smista(io)
  const puoAssistere = assiste(io)
  const aperto = ['da_verificare', 'inviato', 'in_lavorazione', 'in_attesa'].includes(t.stato)
  const blocchi: React.ReactNode[] = []

  if (t.stato === 'da_verificare' && puoSmistare) {
    blocchi.push(
      t.tipo === 'proposta' ? (
        <p key="proposta" className="piccolo">Le proposte di modifica non vanno a R2D: si portano alla riunione settimanale e si chiudono qui con quello che si è deciso.</p>
      ) : (
        <form key="invia" action={inviaTicket} className="modulo">
          <Nascosti t={t} qui={qui} />
          <div className="campo">
            <label htmlFor="nota-invio">Per R2D (facoltativo)</label>
            <textarea id="nota-invio" name="nota" rows={2} placeholder="Cosa hai già verificato tu" />
          </div>
          <BottoneInvio testo="Manda a R2D" inCorso="Invio…" />
        </form>
      ),
      <form key="desk" action={risolviTicketDesk} className="modulo">
        <Nascosti t={t} qui={qui} />
        <div className="campo">
          <label htmlFor="risposta">{t.tipo === 'proposta' ? 'Cosa si è deciso' : 'Risolvi al desk: la risposta'}</label>
          <textarea id="risposta" name="risposta" rows={3} required
            placeholder={t.tipo === 'proposta' ? 'Decisa nella riunione del…, vedi modifica #…; oppure: non si fa, perché…' : 'Cosa hai risposto o sistemato'} />
        </div>
        <SceltaNatura predefinita={NATURA_DESK[t.tipo]} />
        <BottoneInvio testo={t.tipo === 'proposta' ? 'Chiudi la proposta' : 'Risolto al desk'} inCorso="Salvataggio…" classe="secondario" />
      </form>,
    )
  }

  if (aperto && puoAssistere) {
    if (t.stato !== 'in_lavorazione' || t.preso_da !== io?.id) {
      blocchi.push(
        <form key="prendi" action={prendiTicket} className="azioni-scheda">
          <Nascosti t={t} qui={qui} />
          <BottoneInvio testo={t.preso_nome && t.preso_da !== io?.id ? `Prendo io (ora ${t.preso_nome})` : 'Prendo in carico'} inCorso="…" />
        </form>,
      )
    }
    if (t.stato !== 'da_verificare') {
      blocchi.push(
        <form key="risolvi" action={risolviTicket} className="modulo">
          <Nascosti t={t} qui={qui} />
          <div className="modulo-titolo">Risolvi il ticket</div>
          <SceltaNatura />
          <div className="campo">
            <label htmlFor="causa">Causa</label>
            <textarea id="causa" name="causa" rows={2} required placeholder="Perché succedeva" />
          </div>
          <div className="campo">
            <label htmlFor="soluzione">Soluzione</label>
            <textarea id="soluzione" name="soluzione" rows={3} required placeholder="Cosa si è fatto, e cosa deve fare il desk la prossima volta" />
          </div>
          <BottoneInvio testo="Risolto" inCorso="Salvataggio…" />
        </form>,
      )
    }
    if (t.stato === 'inviato' || t.stato === 'in_lavorazione') {
      blocchi.push(
        <form key="chiedi" action={chiediTicket} className="modulo">
          <Nascosti t={t} qui={qui} />
          <div className="campo">
            <label htmlFor="domanda" className="modulo-titolo">Chiedi informazioni a Passion</label>
            <textarea id="domanda" name="domanda" rows={2} required placeholder="Cosa serve sapere per andare avanti" />
          </div>
          <BottoneInvio testo="Chiedi e metti in attesa" inCorso="Invio…" classe="secondario" />
        </form>,
      )
    }
  }

  if (aperto && (puoSmistare || puoAssistere)) {
    blocchi.push(
      <form key="unisci" action={unisciTicket} className="azioni-scheda">
        <Nascosti t={t} qui={qui} />
        <label htmlFor="unisci-in" className="modulo-titolo">Stesso problema del ticket</label>
        <div className="azioni-riga">
          <input id="unisci-in" name="in" type="number" min={1} required placeholder="#" className="campo-breve" />
          <button className="bottone secondario piccolo">Unisci</button>
        </div>
      </form>,
    )
  }

  if (['risolto', 'risolto_desk', 'doppione'].includes(t.stato) && (puoSmistare || puoAssistere)) {
    blocchi.push(
      <details key="riapri" className="riapri">
        <summary className="bottone secondario piccolo">Riapri</summary>
        <form action={riapriTicket} className="modulo riapri-avviso">
          <Nascosti t={t} qui={qui} />
          <textarea name="motivo" rows={2} required placeholder="Perché si riapre" aria-label="Perché si riapre" />
          <button className="bottone piccolo">Riapri il ticket</button>
        </form>
      </details>,
    )
  }

  if (t.tipo === 'modifica' && puoAssistere) {
    if (t.stato === 'da_confermare') {
      blocchi.push(
        <form key="conferma" action={confermaModifica} className="modulo">
          <Nascosti t={t} qui={qui} />
          <div className="campo">
            <label htmlFor="nota-conferma">La conferma del titolare</label>
            <input id="nota-conferma" name="nota" type="text" required placeholder="Chi, come e quando: WhatsApp del 30/09, email, in riunione…" />
          </div>
          <BottoneInvio testo="Registra la conferma" inCorso="Salvataggio…" />
        </form>,
        <details key="correggi">
          <summary className="bottone secondario piccolo">Correggi la modifica</summary>
          <ModuloModifica azione={aggiornaModifica} testo="Salva le correzioni" riunione={t.riunione}
            valori={{ titolo: t.titolo, descrizione: t.descrizione, abbonamenti: t.abbonamenti, dal: t.dal, comunicazione: t.comunicazione }}
            campiNascosti={{ ticket: String(t.id), torna: qui }} />
        </details>,
      )
    }
    if (t.stato === 'confermata') {
      blocchi.push(
        <form key="rilascia" action={rilasciaModifica} className="modulo">
          <Nascosti t={t} qui={qui} />
          <div className="campo">
            <label htmlFor="verifica">Cosa hai verificato prima e dopo</label>
            <textarea id="verifica" name="verifica" rows={3} required placeholder="Provato con un profilo di test: …" />
          </div>
          <BottoneInvio testo="Rilasciata" inCorso="Salvataggio…" />
        </form>,
      )
    }
    if (t.stato === 'da_confermare' || t.stato === 'confermata') {
      blocchi.push(
        <details key="annulla" className="riapri">
          <summary className="bottone secondario piccolo">Annulla la modifica</summary>
          <form action={annullaModifica} className="modulo riapri-avviso">
            <Nascosti t={t} qui={qui} />
            <textarea name="motivo" rows={2} required placeholder="Perché si annulla" aria-label="Perché si annulla" />
            <button className="bottone piccolo">Annulla</button>
          </form>
        </details>,
      )
    }
  }

  if (blocchi.length === 0) return null
  return (
    <section className="scheda ticket-azioni">
      <h2>Cosa fare</h2>
      <div className="stack">{blocchi}</div>
    </section>
  )
}
