import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware de autenticação do Next.js.
 * Verifica o cookie de acesso e redireciona conforme necessário.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Token de acesso nos cookies
  const accessToken = request.cookies.get('access')?.value

  // Rotas que não exigem autenticação
  const publicPaths = ['/login']
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path))

  // Raiz: redirecionar baseado na autenticação
  if (pathname === '/') {
    if (accessToken) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Rota privada sem token — redirecionar para login
  if (!isPublicPath && !accessToken) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Página de login com token ativo — redirecionar para dashboard
  if (pathname.startsWith('/login') && accessToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Aplicar em todas as rotas exceto assets estáticos e API interna
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
}
