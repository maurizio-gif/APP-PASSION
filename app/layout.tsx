import './globals.css'

export const metadata = {
  title: 'App Passion',
  description: 'Il gestionale di Passion Fitness, dal mirror di PerfectGym',
  // L'icona dell'app (CRM Passion): la scheda del browser e la schermata home.
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  // Il nome sotto l'icona, su iPhone. L'icona apre Safari come sempre (non
  // un'app a se': avrebbe un accesso suo, e le schede aperte dai Task
  // uscirebbero dall'app).
  appleWebApp: { title: 'CRM Passion', capable: false },
  robots: { index: false, follow: false },
}

export const viewport = {
  themeColor: '#000000',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" data-tema="chiaro" suppressHydrationWarning>
      <head>
        {/* Il tema scelto (chiaro o scuro) si applica subito, prima del disegno della pagina. */}
        <script
          dangerouslySetInnerHTML={{
            __html: "try{if(localStorage.getItem('tema')==='scuro')document.documentElement.removeAttribute('data-tema')}catch(e){}",
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
