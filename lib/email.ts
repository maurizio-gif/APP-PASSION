import 'server-only'
import { crm } from '@/lib/crm'
import { traduci, TIPO_TICKET } from '@/lib/formato'

// Le email del CRM, mandate con SendGrid. Le chiavi sono variabili d'ambiente
// del progetto Vercel crm-passion (le stesse due del sito):
//   SENDGRID_API_KEY   chiave con il solo permesso «Mail Send»
//   SENDGRID_FROM      mittente verificato in SendGrid (anche "Nome <a@b.it>")
// Se mancano, l'email non parte e il CRM funziona come prima: un avviso non
// deve mai far fallire un'azione.

// Chi avvisa R2D quando un ticket le arriva.
const AVVISO_R2D = 'michele@ready2digital.it'

const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)
const riga = (v: unknown, max = 200) => String(v ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, max)

function mittente(da: string) {
  const m = /^\s*(.*?)\s*<([^<>\s]+)>\s*$/.exec(da)
  return m ? { email: m[2], name: m[1].replace(/^"|"$/g, '') || 'CRM Passion Fitness' } : { email: da.trim(), name: 'CRM Passion Fitness' }
}

// Un ticket e' arrivato a R2D (aperto dal supporto o inviato dal supporto):
// avvisa Michele con l'essenziale e il link. Non lancia mai errori.
export async function avvisaTicketAR2D(id: number | null) {
  try {
    const chiave = process.env.SENDGRID_API_KEY
    const da = process.env.SENDGRID_FROM
    if (!id || !chiave || !da) return
    const t = await crm.ticket(id)
    if (!t || t.stato !== 'inviato') return

    const sito = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://crm.passionfitness.it').replace(/\/$/, '')
    const link = `${sito}/dashboard/ticket/${t.id}`
    const tipo = traduci(TIPO_TICKET, t.tipo)
    const persona = t.persona ? [t.persona.nome, t.persona.cognome].filter(Boolean).join(' ') : ''
    const descrizione = t.descrizione.length > 600 ? `${t.descrizione.slice(0, 600)}…` : t.descrizione
    const oggetto = `${t.bloccante ? '[BLOCCA IL LAVORO] ' : ''}Ticket #${t.id} da Passion: ${riga(t.titolo, 120)}`
    const f = 'font-family:Helvetica,Arial,sans-serif;'

    const r = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${chiave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: mittente(da),
        personalizations: [{ to: [{ email: AVVISO_R2D }] }],
        subject: oggetto,
        content: [
          {
            type: 'text/plain',
            value:
              `Nuovo ticket per R2D dal CRM di Passion Fitness.\n\n#${t.id} · ${tipo}${t.bloccante ? ' · BLOCCA IL LAVORO DI TUTTI' : ''}\n` +
              `${riga(t.titolo)}\n\nAperto da: ${t.aperto_da_nome ?? '—'}${persona ? `\nSocio: ${persona}` : ''}\n\n${descrizione}\n\nApri il ticket: ${link}\n`,
          },
          {
            type: 'text/html',
            value:
              `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#feeded;"><tr><td align="center" style="padding:24px 12px;">` +
              `<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #f0d6d6;border-radius:14px;overflow:hidden;">` +
              `<tr><td style="background:#000;padding:20px 28px;${f}color:#fff;font-size:12px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;">Ticket per R2D &middot; CRM Passion Fitness</td></tr>` +
              `<tr><td style="height:5px;line-height:5px;font-size:0;background:#e3032d;">&nbsp;</td></tr>` +
              `<tr><td style="padding:28px;${f}color:#1b1b1b;">` +
              (t.bloccante ? `<p style="margin:0 0 14px;padding:10px 14px;background:#e3032d;color:#fff;font-weight:700;border-radius:8px;">Blocca il lavoro di tutti: chiamare anche R2D</p>` : '') +
              `<p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#e3032d;">#${t.id} &middot; ${esc(tipo)}</p>` +
              `<h1 style="margin:0 0 16px;font-size:22px;line-height:1.25;">${esc(t.titolo)}</h1>` +
              `<p style="margin:0 0 16px;font-size:14px;color:#6b6260;">Aperto da <strong style="color:#1b1b1b;">${esc(t.aperto_da_nome ?? '—')}</strong>` +
              (persona ? `<br>Socio: <strong style="color:#1b1b1b;">${esc(persona)}</strong>` : '') +
              `</p><p style="margin:0 0 24px;padding:14px 16px;background:#feeded;border-radius:10px;font-size:15px;line-height:1.55;white-space:pre-line;">${esc(descrizione)}</p>` +
              `<a href="${esc(link)}" style="display:inline-block;padding:14px 28px;background:#e3032d;color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:13px;letter-spacing:.08em;text-transform:uppercase;">Apri il ticket &rarr;</a>` +
              `</td></tr></table></td></tr></table>`,
          },
        ],
      }),
      signal: AbortSignal.timeout(8000),
    })
    if (!r.ok) console.error('avvisaTicketAR2D: SendGrid', r.status, (await r.text()).slice(0, 200))
  } catch (e) {
    console.error('avvisaTicketAR2D:', e instanceof Error ? e.message : e)
  }
}
