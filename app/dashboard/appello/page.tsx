import Link from 'next/link'
import { crm, richiediSezione } from '@/lib/crm'
import { eGiornoValido, formatoGiornoLungo, oggiRoma, spostaGiorno } from '@/lib/formato'
import { AppelloLezione } from '@/components/AppelloLezione'
import { Vuoto } from '@/components/Ui'

const giornoRoma = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date(iso))

// L'Appello istruttore: le lezioni di chi guarda e i loro prenotati, di oggi e
// dei prossimi giorni. Le presenze si segnano da 59 minuti prima dell'inizio a
// 59 minuti dopo la fine della lezione; prima e dopo si legge e basta. Chi e'
// l'istruttore lo dice la stessa email su PerfectGym; le regole stanno nel
// database (supabase/migrations/20261027i_appello.sql). Tutte le lezioni di
// tutti stanno in «Appello complessivo».
export default async function Appello({ searchParams }: { searchParams: { giorno?: string } }) {
  await richiediSezione('appello')
  const oggi = oggiRoma()
  // Senza un giorno: oggi e i prossimi sei. Con un giorno (anche passato): quel giorno.
  const singolo = eGiornoValido(searchParams.giorno) ? searchParams.giorno : null
  const a = await crm.appello(singolo, singolo ? 1 : 7)

  const perGiorno = new Map<string, typeof a.lezioni>()
  for (const l of a.lezioni) {
    const g = giornoRoma(l.inizio)
    perGiorno.set(g, [...(perGiorno.get(g) ?? []), l])
  }
  const etichetta = (g: string) => (g === oggi ? `Oggi · ${formatoGiornoLungo(g)}` : g === spostaGiorno(oggi, 1) ? `Domani · ${formatoGiornoLungo(g)}` : formatoGiornoLungo(g))

  return (
    <>
      <div className="testata">
        <div>
          <h1>Appello istruttore</h1>
          <p>
            Le tue lezioni e chi le ha prenotate, di oggi e dei prossimi giorni. La presenza si segna da <strong>59 minuti prima</strong> dell&apos;inizio fino a{' '}
            <strong>59 minuti dopo</strong> la fine della lezione: prima e dopo si legge soltanto.
            {a.istruttori.length > 0 && <> Sei collegato come {a.istruttori.join(', ')}.</>}
          </p>
        </div>
      </div>

      <form className="filtri" action="/dashboard/appello">
        {singolo && (
          <Link className="bottone secondario" href={`/dashboard/appello?giorno=${spostaGiorno(singolo, -1)}`} aria-label="Giorno prima">
            ←
          </Link>
        )}
        <input type="date" name="giorno" defaultValue={singolo ?? ''} aria-label="Vai a un giorno" />
        <button className="bottone secondario" type="submit">
          Vai al giorno
        </button>
        {singolo && (
          <>
            <Link className="bottone secondario" href={`/dashboard/appello?giorno=${spostaGiorno(singolo, 1)}`} aria-label="Giorno dopo">
              →
            </Link>
            <Link href="/dashboard/appello">Oggi e prossimi giorni</Link>
          </>
        )}
      </form>

      {!a.collegato ? (
        <div className="scheda">
          <Vuoto>
            Il tuo account non è collegato a un istruttore di PerfectGym: serve la stessa email che l&apos;istruttore ha su PerfectGym. Chiedi a un admin di controllarla.
          </Vuoto>
        </div>
      ) : a.lezioni.length === 0 ? (
        <div className="scheda">
          <Vuoto>{singolo ? 'Nessuna tua lezione in questo giorno.' : 'Nessuna tua lezione nei prossimi giorni.'}</Vuoto>
        </div>
      ) : (
        [...perGiorno.entries()].map(([giorno, lezioni]) => (
          <div key={giorno}>
            <h2 className="appello-giorno">{etichetta(giorno)}</h2>
            {lezioni.map((l) => (
              <AppelloLezione key={l.class_id} l={l} />
            ))}
          </div>
        ))
      )}
    </>
  )
}
