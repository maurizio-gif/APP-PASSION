import './globals.css'

export const metadata = {
  title: 'App Passion',
  description: 'Il gestionale di Passion Fitness, dal mirror di PerfectGym',
  icons: {
    icon: [{ url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' }],
    apple: '/apple-touch-icon.png',
  },
  robots: { index: false, follow: false },
}

export const viewport = {
  themeColor: '#000000',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  )
}
