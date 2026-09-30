'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { registraAllegati, type AllegatoCaricato } from '@/app/dashboard/azioni'

// Foto, video e PDF di un ticket: il browser li carica dritti su Storage
// (bucket privato `ticket`, cartella del ticket, con la sessione di chi e'
// entrato: la policy lascia caricare solo lo staff), poi il server li registra
// nel ticket. Cosi' i file non passano dal server dell'app, che ha un limite
// basso sulla dimensione delle richieste.
const MASSIMO = 25 * 1024 * 1024
const ACCETTATI = 'image/*,application/pdf,video/mp4,video/quicktime,video/webm'

const nomeSicuro = (nome: string) =>
  nome.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-80) || 'allegato'

export function CaricaAllegati({ ticket }: { ticket: number }) {
  const router = useRouter()
  const campo = useRef<HTMLInputElement>(null)
  const [stato, setStato] = useState<{ inCorso: boolean; errore?: string; fatto?: string }>({ inCorso: false })

  async function carica() {
    const file = Array.from(campo.current?.files ?? [])
    if (file.length === 0) return
    const troppo = file.find((f) => f.size > MASSIMO)
    if (troppo) {
      setStato({ inCorso: false, errore: `«${troppo.name}» supera i 25 MB: accorcia il video o manda una foto.` })
      return
    }
    setStato({ inCorso: true })
    const supabase = createSupabaseBrowserClient()
    const caricati: AllegatoCaricato[] = []
    for (const f of file) {
      const percorso = `${ticket}/${crypto.randomUUID()}-${nomeSicuro(f.name)}`
      const { error } = await supabase.storage.from('ticket').upload(percorso, f, { contentType: f.type || undefined })
      if (error) {
        setStato({ inCorso: false, errore: `«${f.name}» non caricato: ${error.message}` })
        if (caricati.length) await registraAllegati(ticket, caricati)
        router.refresh()
        return
      }
      caricati.push({ percorso, nome: f.name, tipo: f.type || null, dimensione: f.size })
    }
    const esito = await registraAllegati(ticket, caricati)
    if (campo.current) campo.current.value = ''
    setStato(esito.errore
      ? { inCorso: false, errore: esito.errore }
      : { inCorso: false, fatto: caricati.length === 1 ? 'Allegato aggiunto.' : `${caricati.length} allegati aggiunti.` })
    router.refresh()
  }

  return (
    <div className="allegati-carica">
      <label htmlFor={`allegati-${ticket}`}>Aggiungi foto, video o PDF</label>
      <div className="azioni-riga">
        <input id={`allegati-${ticket}`} ref={campo} type="file" multiple accept={ACCETTATI} disabled={stato.inCorso} />
        <button type="button" className="bottone secondario piccolo" onClick={carica} disabled={stato.inCorso}>
          {stato.inCorso ? 'Caricamento…' : 'Carica'}
        </button>
      </div>
      <p className="piccolo attenuato">Fino a 25 MB per file. Per un video lungo basta la parte in cui si vede il problema.</p>
      {stato.errore && <p className="avviso">{stato.errore}</p>}
      {stato.fatto && <p className="avviso ok">{stato.fatto}</p>}
    </div>
  )
}
