'use client'

import { useEffect } from 'react'

// All'apertura dell'elenco di oggi, scorre fino alla riga «Adesso»: le lezioni
// gia' finite restano sopra, quelle da fare sotto.
export function ScorriAdesso() {
  useEffect(() => {
    document.getElementById('adesso')?.scrollIntoView({ block: 'start' })
  }, [])
  return null
}
