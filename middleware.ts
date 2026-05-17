import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Paths that don't require auth
const publicPaths = ['/login', '/registro', '/recuperar', '/pricing', '/api/auth', '/api/stripe-webhook', '/']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public paths
  if (publicPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Skip static files and API routes that handle their own auth
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next()
  }

  // Get token from cookie (httpOnly, set by login)
  const token = req.cookies.get('auth_token')?.value

  // Also check Authorization header (for API routes)
  const authHeader = req.headers.get('authorization')
  const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  // Use cookie token if available, otherwise fall back to header token
  const effectiveToken = token || headerToken

  if (!effectiveToken) {
    // No token → redirect to login for pages, 401 for API
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'No authentication', code: 'UNAUTHORIZED' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Validate token server-side (decode JWT payload)
  try {
    const parts = effectiveToken.split('.')
    if (parts.length !== 3) throw new Error('Invalid token format')

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'))

    // Check expiration
    if (payload.exp && payload.exp < Date.now() / 1000) {
      throw new Error('Token expired')
    }

    // Add user info to headers for downstream use
    const requestHeaders = new Headers(req.headers)
    requestHeaders.set('x-user-id', payload.sub || payload.userId || '')
    requestHeaders.set('x-company-id', payload.companyId || '')
    requestHeaders.set('x-user-email', payload.email || '')

    return NextResponse.next({ request: { headers: requestHeaders } })
  } catch (err) {
    // Invalid token → redirect to login for pages, 401 for API
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Invalid or expired token', code: 'INVALID_TOKEN' }, { status: 401 })
    }
    const response = NextResponse.redirect(new URL('/login', req.url))
    // Clear invalid cookie
    response.cookies.delete('auth_token')
    return response
  }
}

export const config = {
  matcher: [
    /* Match all paths except static files */
    '/((?!_next/static|_next/image|favicon.ico).*)'
  ]
}