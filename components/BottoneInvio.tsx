'use client'

import { useFormStatus } from 'react-dom'

// Il bottone di un modulo con server action: mentre la richiesta e' in corso
// si spegne e lo dice, cosi' un secondo click non manda il modulo due volte.
export function BottoneInvio({ testo, inCorso, classe }: { testo: string; inCorso: string; classe?: string }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className={classe ? `bottone ${classe}` : 'bottone'} disabled={pending}>
      {pending ? inCorso : testo}
    </button>
  )
}
