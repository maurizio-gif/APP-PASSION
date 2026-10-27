import type { Candidatura } from '@/lib/crm'
import { eta, formatoData, formatoDataOra, formatoPeso, POSIZIONE, traduci } from '@/lib/formato'
import { Contatti, LinkGuida, Schede, Vuoto } from './Ui'
import { Riquadro } from './FaseRighe'

// La pagina Curriculum, disegnata: riceve le candidature gia' lette e i link
// firmati ai file (app/dashboard/curriculum/page.tsx) e non ne calcola nessuno.

type Vista = { chiave: string; testo: string; n: number }

// «CV_Mario.pdf» -> «PDF»: solo l'etichetta sul file.
const estensione = (nome: string) => (nome.includes('.') ? nome.split('.').pop()!.slice(0, 4).toUpperCase() : 'FILE')

export function VistaCurriculum({ viste, vista, candidature, link }: {
  viste: Vista[]
  vista: string
  candidature: Candidatura[]
  link: Record<string, string>
}) {
  const attiva = viste.find((v) => v.chiave === vista) ?? viste[0]
  return (
    <>
      <div className="testata">
        <div>
          <div className="titolo-riga">
            <h1>Curriculum</h1>
            <span className="aiuto-titolo" tabIndex={0} role="note" aria-label="Cos'è questa sezione">
              <span className="aiuto-punto" aria-hidden="true">?</span>
              <span className="aiuto-testo">Le candidature arrivate dal sito, con le risposte del modulo e il curriculum allegato. I più recenti in alto.{' '}<LinkGuida argomento="curriculum" /></span>
            </span>
          </div>
        </div>
      </div>

      <div className="cv-schede">
        <Schede voci={viste} attiva={vista} base="/dashboard/curriculum" />
      </div>

      <Riquadro
        classe="cv-riquadro"
        titolo={
          <>
            {attiva.chiave === 'tutte' ? 'Tutte le candidature' : attiva.testo}
            <span className="chip-gruppo"><span className="chip">{attiva.n} {attiva.n === 1 ? 'candidatura' : 'candidature'}</span></span>
          </>
        }
      >
        {candidature.length === 0 ? (
          <Vuoto>Nessuna candidatura qui.</Vuoto>
        ) : (
          <div className="cv-elenco" role="table" aria-label="Candidature">
            <div className="cv-testa" role="row">
              <span role="columnheader">Candidato</span>
              <span role="columnheader">Contatti</span>
              <span role="columnheader">Posizione</span>
              <span role="columnheader">Nato il</span>
              <span role="columnheader">Curriculum</span>
            </div>
            {candidature.map((c) => {
              const url = link[c.file_percorso]
              const anni = eta(c.data_nascita)
              return (
                <div className="cv-riga" role="row" key={c.id}>
                  <div className="cv-candidato" role="cell">
                    <strong>{c.nome} {c.cognome}</strong>
                    <span>Arrivato il {formatoDataOra(c.creato_il)}</span>
                  </div>
                  <div className="cv-contatti riga-dati" role="cell">
                    <Contatti telefono={c.telefono} email={c.email} />
                  </div>
                  <div role="cell">
                    <span className={`cv-posizione pos-${c.posizione}`}>{traduci(POSIZIONE, c.posizione)}</span>
                  </div>
                  <div className="cv-nascita" role="cell">
                    <strong>{formatoData(c.data_nascita)}</strong>
                    {anni != null && <span>{anni} anni</span>}
                  </div>
                  <div role="cell">
                    {url ? (
                      <a className="cv-file" href={url} target="_blank" rel="noreferrer" title={c.file_nome}>
                        <span className="cv-file-tipo" data-tipo={estensione(c.file_nome)}>{estensione(c.file_nome)}</span>
                        <span className="cv-file-testo">
                          <strong>{c.file_nome}</strong>
                          <small>{formatoPeso(c.file_dimensione)} · Apri</small>
                        </span>
                      </a>
                    ) : (
                      <span className="cv-file spento" title={c.file_nome}>
                        <span className="cv-file-tipo">{estensione(c.file_nome)}</span>
                        <span className="cv-file-testo">
                          <strong>{c.file_nome}</strong>
                          <small>{formatoPeso(c.file_dimensione)} · non raggiungibile</small>
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Riquadro>
    </>
  )
}
