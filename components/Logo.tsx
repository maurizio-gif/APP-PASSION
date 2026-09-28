// Il logo del sito, bianco: sta solo su fondo nero.
export function Logo({ larghezza = 150 }: { larghezza?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo-passionfitness.svg" alt="Passion Fitness" width={larghezza} height={Math.round(larghezza / 2)} />
  )
}
