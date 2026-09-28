import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Su ogni pagina di /dashboard: rinfresca il cookie di sessione di Supabase e,
// senza una sessione valida, rimanda a /login.
//
// Chi e' entrato ma non e' nello staff passa di qui: lo ferma il layout della
// dashboard (e, comunque, ogni funzione crm_* del database).
export async function middleware(request: NextRequest) {
  const cookieDaScrivere: { name: string; value: string; options: CookieOptions }[] = []

  let entrato = false
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const chiave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !chiave) {
      const variabile = !url ? 'NEXT_PUBLIC_SUPABASE_URL' : 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
      return NextResponse.redirect(new URL(`/login?error=configurazione&variabile=${variabile}`, request.url))
    }
    const supabase = createServerClient(url, chiave, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          cookieDaScrivere.push(...cookiesToSet)
        },
      },
    })
    const { data } = await supabase.auth.getUser()
    entrato = Boolean(data.user)
  } catch {
    // Supabase Auth irraggiungibile: meglio la pagina di login con un messaggio
    // che una schermata bianca.
    return NextResponse.redirect(new URL('/login?error=database', request.url))
  }

  if (!entrato) return NextResponse.redirect(new URL('/login', request.url))

  const risposta = NextResponse.next({ request })
  cookieDaScrivere.forEach(({ name, value, options }) => risposta.cookies.set(name, value, options))
  return risposta
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
