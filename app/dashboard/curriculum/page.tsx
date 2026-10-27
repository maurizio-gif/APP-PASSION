import { crm, richiediSezione, type Candidatura } from '@/lib/crm'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { POSIZIONE } from '@/lib/formato'
import { VistaCurriculum } from '@/components/VistaCurriculum'

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

  return <VistaCurriculum viste={viste} vista={vista} candidature={candidature} link={Object.fromEntries(link)} />
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
