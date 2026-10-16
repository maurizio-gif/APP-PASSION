// Mentre arriva una pagina: uno scheletro che pulsa piano, invece di una scritta sola
// (il contenuto non sparisce di colpo e la pagina non \"salta\").
export default function Caricamento() {
  return (
    <div className="scheletro" aria-busy="true" aria-label="Caricamento">
      <div className="scheletro-riga titolo" />
      <div className="scheletro-riga sotto" />
      <div className="scheletro-scheda">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="scheletro-riga" style={{ width: `${92 - i * 7}%` }} />
        ))}
      </div>
    </div>
  )
}
