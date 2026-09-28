/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Un elenco rivisto dopo mezzo minuto non fa danno, rifare la query a ogni
    // click si paga su ogni passo: e' lo stesso compromesso dell'app Athlon.
    staleTimes: { dynamic: 30 },
  },
}

export default nextConfig
