import { crm, richiediSezione } from '@/lib/crm'
import { CONTROLLO, formatoData, formatoEuro, traduci } from '@/lib/formato'
import { Avviso, Contatti, Persona, Schede, Vuoto } from '@/components/Ui'
import { aggiornaContratto } from '../azioni'

const VISTE = [
  { chiave: 'da_controllare', testo: 'Da controllare' },
  { chiave: 'controllati', testo: 'Controllati' },
  { chiave: 'tutti', testo: 'Tutti' },
]

// «Nuovi contratti»: ogni contratto nuovo di PerfectGym arriva qui per i
// controlli (metodo di pagamento, codice fiscale, tesseramento ASI).
export default async function Contratti({ searchParams }: { searchParams: { vista?: string; errore?: string } }) {
  await richiediSezione('contratti')
  const vista = VISTE.some((v) => v.chiave === searchParams.vista) ? searchParams.vista! : 'da_controllare'
  const contratti = await crm.nuoviContratti(vista)
  const qui = `/dashboard/contratti?vista=${vista}`

  return (
    <>
      <div className="testata">
        <div>
          <h1>Nuovi contratti</h1>
          <p>I controlli su ogni contratto firmato: pagamento, codice fiscale, tessera.</p>
        </div>
      </div>
      <Avviso errore={searchParams.errore} />
      <Schede voci={VISTE} attiva={vista} base="/dashboard/contratti" />

      {contratti.length === 0 ? (
        <div className="scheda"><Vuoto>Nessun contratto qui.</Vuoto></div>
      ) : (
        contratti.map((c) => (
          <section className="scheda" key={c.contract_id}>
            <div className="testata-scheda">
              <div>
                <Persona id={c.utente_id} nome={c.nome} cognome={c.cognome} />{' '}
                <span className="piccolo attenuato">n. {c.numero_socio ?? '—'}</span>
                <Contatti telefono={c.telefono} email={c.email} />
              </div>
              <span className={`bollino ${c.controllo === 'controllato' ? 'verde' : c.controllo === 'errore' ? 'rosso' : 'giallo'}`}>
                {traduci(CONTROLLO, c.controllo)}
              </span>
            </div>
            <p className="piccolo">
              <strong>{c.piano ?? '—'}</strong> · {formatoEuro(c.canone)} · firmato {formatoData(c.data_firma)} · dal {formatoData(c.data_inizio)}
              {c.consulente_pgm ? ` · venduto da ${c.consulente_pgm}` : ''}
              {c.gestito_nome ? ` · controllato da ${c.gestito_nome}` : ''}
            </p>
            <p className="piccolo">
              Su PerfectGym:{' '}
              <span className={`bollino ${c.metodo_pagamento_pgm ? 'verde' : 'rosso'}`}>{c.metodo_pagamento_pgm ? 'metodo di pagamento presente' : 'nessun metodo di pagamento'}</span>{' '}
              <span className={`bollino ${c.codice_fiscale_pgm ? 'verde' : 'rosso'}`}>{c.codice_fiscale_pgm ? `CF ${c.codice_fiscale_pgm}` : 'codice fiscale mancante'}</span>
            </p>
            <form action={aggiornaContratto} className="modulo">
              <input type="hidden" name="contratto" value={c.contract_id} />
              <input type="hidden" name="torna" value={qui} />
              <div className="azioni-riga">
                <label className="spunta"><input type="checkbox" name="metodo" defaultChecked={Boolean(c.metodo_pagamento_ok)} /> Pagamento ok</label>
                <label className="spunta"><input type="checkbox" name="cf" defaultChecked={Boolean(c.codice_fiscale_ok)} /> Codice fiscale ok</label>
              </div>
              <div className="due-colonne">
                <div className="campo">
                  <label>Tesseramento</label>
                  <select name="tesseramento" defaultValue={c.tesseramento ?? ''}>
                    <option value="">—</option>
                    <option value="si">Tesserato</option>
                    <option value="gia_presente">Già presente</option>
                    <option value="no">Non tesserato</option>
                  </select>
                </div>
                <div className="campo">
                  <label>Numero tessera</label>
                  <input type="text" name="numero_tessera" defaultValue={c.numero_tessera ?? ''} />
                </div>
                <div className="campo">
                  <label>Errore ASI</label>
                  <input type="text" name="errore_asi" defaultValue={c.errore_asi ?? ''} />
                </div>
                <div className="campo">
                  <label>Fonte</label>
                  <input type="text" name="fonte" defaultValue={c.fonte ?? ''} placeholder="Tour, sito, referral…" />
                </div>
                <div className="campo">
                  <label>Referral</label>
                  <input type="text" name="referral" defaultValue={c.referral ?? ''} placeholder="Chi l'ha presentato" />
                </div>
                <div className="campo">
                  <label>Stato del controllo</label>
                  <select name="controllo" defaultValue={c.controllo}>
                    {Object.entries(CONTROLLO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="campo">
                <label>Note</label>
                <input type="text" name="note" defaultValue={c.note ?? ''} />
              </div>
              <button className="bottone piccolo">Salva</button>
            </form>
          </section>
        ))
      )}
    </>
  )
}
