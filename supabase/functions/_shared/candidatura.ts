// Le regole di una candidatura ("Inviaci il tuo CV" sul sito), senza Deno ne'
// rete: stanno qui per poterle provare da sole (vedi crm-candidatura).
//
// Il sito controlla gli stessi campi prima dell'invio, ma il browser non e' una
// garanzia: qui si rifa' tutto, e il file si riconosce dai primi byte e non
// dall'estensione o dal tipo dichiarato, che chiunque puo' scrivere a mano.

export const MAX_BYTE = 10 * 1024 * 1024

export const POSIZIONI = ['istruttore_fitness', 'istruttore_sala_pesi', 'receptionist'] as const
export type Posizione = (typeof POSIZIONI)[number]

// Estensione -> tipo con cui il file viene salvato. Il DNG e' un TIFF: i
// browser lo dichiarano male o non lo dichiarano, per questo il tipo lo
// decidiamo noi.
export const TIPI: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  dng: 'image/x-adobe-dng',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

const inizia = (b: Uint8Array, ...byte: number[]) => byte.every((v, i) => b[i] === v)

// I primi byte devono essere quelli del formato che l'estensione dichiara.
export function firmaCorretta(estensione: string, testa: Uint8Array): boolean {
  switch (estensione) {
    case 'pdf':
      return inizia(testa, 0x25, 0x50, 0x44, 0x46) // %PDF
    case 'jpg':
    case 'jpeg':
      return inizia(testa, 0xff, 0xd8, 0xff)
    case 'docx':
      return inizia(testa, 0x50, 0x4b, 0x03, 0x04) // zip
    case 'doc':
      return inizia(testa, 0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1) // OLE2
    case 'dng':
      return inizia(testa, 0x49, 0x49, 0x2a, 0x00) || inizia(testa, 0x4d, 0x4d, 0x00, 0x2a) // TIFF
    default:
      return false
  }
}

export const estensioneDi = (nome: string) => (nome.split('.').length > 1 ? nome.split('.').pop()!.toLowerCase() : '')

export type Dati = {
  posizione: Posizione
  nome: string
  cognome: string
  email: string
  telefono: string
  data_nascita: string
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/
const TELEFONO = /^\+\d{8,15}$/
const GIORNO = /^(\d{4})-(\d{2})-(\d{2})$/

const testo = (v: unknown) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '')

// Tutti i campi sono obbligatori. Restituisce i dati puliti o il messaggio da
// mostrare alla persona.
export function validaDati(campi: Record<string, unknown>, oggi = new Date()): { dati: Dati } | { errore: string } {
  const nome = testo(campi.nome)
  const cognome = testo(campi.cognome)
  const email = testo(campi.email).toLowerCase()
  const telefono = testo(campi.telefono).replace(/\s+/g, '')
  const posizione = testo(campi.posizione)
  const nascita = testo(campi.data_nascita)

  if (!nome || nome.length > 80) return { errore: 'Serve il nome.' }
  if (!cognome || cognome.length > 80) return { errore: 'Serve il cognome.' }
  if (!EMAIL.test(email) || email.length > 254) return { errore: 'Controlla l’indirizzo email: manca qualcosa.' }
  if (!TELEFONO.test(telefono)) return { errore: 'Controlla il numero di cellulare.' }
  if (!(POSIZIONI as readonly string[]).includes(posizione)) return { errore: 'Scegli la posizione per cui ti candidi.' }

  const m = GIORNO.exec(nascita)
  if (!m) return { errore: 'Inserisci la data di nascita.' }
  const [anno, mese, giorno] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const d = new Date(Date.UTC(anno, mese - 1, giorno))
  if (d.getUTCFullYear() !== anno || d.getUTCMonth() !== mese - 1 || d.getUTCDate() !== giorno) {
    return { errore: 'La data di nascita non è valida.' }
  }
  // Almeno 16 anni (l'eta' minima per lavorare) e non oltre i 100.
  const compie = (eta: number) => Date.UTC(anno + eta, mese - 1, giorno)
  const adesso = Date.UTC(oggi.getUTCFullYear(), oggi.getUTCMonth(), oggi.getUTCDate())
  if (compie(16) > adesso) return { errore: 'Per candidarti serve avere almeno 16 anni.' }
  if (compie(100) < adesso) return { errore: 'La data di nascita non è valida.' }

  return { dati: { posizione: posizione as Posizione, nome, cognome, email, telefono, data_nascita: nascita } }
}

// Un nome di file sicuro per il percorso su Storage: niente accenti, spazi o
// simboli.
export function nomeSicuro(nome: string): string {
  return (
    nome
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/^[-.]+|[-.]+$/g, '')
      .slice(-60) || 'cv'
  )
}
