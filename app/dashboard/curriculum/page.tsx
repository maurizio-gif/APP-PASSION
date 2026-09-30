import { crm, richiediSezione, type Candidatura } from '@/lib/crm'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { eta, formatoData, formatoDataOra, formatoPeso, POSIZIONE, traduci } from '@/lib/formato'
import { Contatti, LinkGuida, Schede, Vuoto } from '@/components/Ui'

// I curriculum arrivati da «Inviaci il tuo CV» sul sito (passionfitness.it/lavora-con-noi):
// le risposte del modulo e il file allegato, uno per riga. Il file sta nel bucket
// privato `curriculum`: si apre con un link firmato che dura un'ora.
export default async function Curriculum({ searchParams }: { searchParams: { vista?: string } }) {
  await richiediSezione('curriculum')
  const conti = await crm.candidatureConti()
  const viste = [
    { chiave: 'tutte', testo: 'Tutti', n: conti.tutte },
    ...Object.entries(POSIZIONE).map(([chiave, testo]) => ({ chiave, testo, n: conti[chiave as keyof typeof conti] })),
  ]
  const vista = viste.some((v) => v.chiave === searchParams.vista) ? searchParams.vista! : 'tutte'
  const candidature = await crm.candidature(vista === 'tutte' ? null : vista)
  const link = await linkFile(candidature)

  return (
    <>
      <div className="testata">
        <div>
          <h1>Curriculum</h1>
          <p>Le candidature arrivate dal sito, con le risposte del modulo e il curriculum allegato. I più recenti in alto.{' '}<LinkGuida argomento="curriculum" /></p>
        </div>
      </div>
      <Schede voci={viste} attiva={vista} base="/dashboard/curriculum" />

      <div className="scheda">
        {candidature.length === 0 ? (
          <Vuoto>Nessuna candidatura qui.</Vuoto>
        ) : (
          <div className="tabella-scorre">
            <table className="schede-mobile">
              <thead>
                <tr>
                  <th>Candidato</th>
                  <th>Posizione</th>
                  <th>Nato il</th>
                  <th>Curriculum</th>
                </tr>
              </thead>
              <tbody>
                {candidature.map((c) => {
                  const url = link.get(c.file_percorso)
                  const anni = eta(c.data_nascita)
                  return (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.nome} {c.cognome}</strong>
                        <Contatti telefono={c.telefono} email={c.email} />
                        <div className="piccolo attenuato">Arrivato il {formatoDataOra(c.creato_il)}</div>
                      </td>
                      <td>{traduci(POSIZIONE, c.posizione)}</td>
                      <td className="nowrap">
                        {formatoData(c.data_nascita)}
                        {anni != null && <div className="piccolo attenuato">{anni} anni</div>}
                      </td>
                      <td>
                        {url ? (
                          <a href={url} target="_blank" rel="noreferrer">{c.file_nome}</a>
                        ) : (
                          <span className="attenuato">{c.file_nome} (non raggiungibile)</span>
                        )}
                        <div className="piccolo attenuato">{formatoPeso(c.file_dimensione)}</div>
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

// I link firmati (un'ora): il bucket e' privato, e la policy di Storage li
// concede solo a chi vede la sezione.
async function linkFile(candidature: Candidatura[]) {
  const mappa = new Map<string, string>()
  if (candidature.length === 0) return mappa
  const supabase = createSupabaseServerClient()
  const { data } = await supabase.storage.from('curriculum').createSignedUrls(candidature.map((c) => c.file_percorso), 3600)
  for (const d of data ?? []) if (d.path && d.signedUrl) mappa.set(d.path, d.signedUrl)
  return mappa
}
