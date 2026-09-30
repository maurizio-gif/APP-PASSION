import { crm, NonAutorizzato } from '@/lib/crm'

export const dynamic = 'force-dynamic'

// La trascrizione di una riunione da scaricare, in testo (.txt): in testa
// titolo, data, durata e partecipanti. Il database la da' solo a superadmin e
// admin; agli altri risponde 403.
export async function GET(_richiesta: Request, { params }: { params: { id: string } }) {
  try {
    const [r, testo] = await Promise.all([crm.riunione(params.id), crm.riunioneTrascrizione(params.id)])
    if (!r || !testo) return new Response('Trascrizione non trovata', { status: 404 })
    const testa = [
      r.titolo,
      [r.data, r.ora?.slice(0, 5), r.durata].filter(Boolean).join(' · '),
      `Partecipanti: ${r.partecipanti.join(', ')}`,
      '',
      '',
    ].join('\n')
    return new Response(testa + testo, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="trascrizione-riunione-${r.data}.txt"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (e) {
    if (e instanceof NonAutorizzato) return new Response('Non autorizzato', { status: 403 })
    throw e
  }
}
