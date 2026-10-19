// Solo presentazione dei task: l'icona del tipo e le iniziali di chi lo fa.
const PERCORSI = {
  telefono: 'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z',
  chat: 'M4 5h16v11H9l-5 4zM8 10h8M8 13h5',
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
  sede: 'M12 21s-6-5.2-6-10a6 6 0 0112 0c0 4.8-6 10-6 10zM12 8.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z',
  cura: 'M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z',
}

export function IconaTask({ tipo }: { tipo: string }) {
  const t = tipo.toLowerCase()
  const d = t.includes('whats') ? PERCORSI.chat
    : t.includes('mail') ? PERCORSI.mail
    : t.includes('sede') || t.includes('appunt') ? PERCORSI.sede
    : t.includes('care') ? PERCORSI.cura
    : PERCORSI.telefono
  return (
    <span className="task-icona" aria-hidden="true">
      <svg viewBox="0 0 24 24"><path d={d} /></svg>
    </span>
  )
}

export function AvatarTask({ nome }: { nome: string }) {
  const sigla = nome.split(/\s+/).filter(Boolean).map((x) => x[0]).join('').slice(0, 2).toUpperCase()
  return <span className="task-avatar" aria-hidden="true">{sigla}</span>
}
