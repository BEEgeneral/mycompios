// AUTH LOGIN - User login with email and password

import { NextResponse } from 'next/server'
import { verifyLoginCredentials, createLoginSession, getLoginTrialStatus } from '../../lib/services/login-service'

// Rate limiting
const loginLimits = new Map()
const LOGIN_MAX = 10
const LOGIN_WINDOW = 3600000

function checkLoginLimit(ip: string): number {
  const now = Date.now()
  const r = loginLimits.get(ip) || { count: 0, resetAt: now + LOGIN_WINDOW }
  if (now > r.resetAt) { r.count = 0; r.resetAt = now + LOGIN_WINDOW }
  r.count++
  loginLimits.set(ip, r)
  if (r.count > LOGIN_MAX) return Math.ceil((r.resetAt - now) / 1000)
  return 0
}

export async function POST(req: Request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  }

  if (req.method === 'OPTIONS') {
    return new NextResponse('', { status: 200, headers })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const retrySec = checkLoginLimit(ip)
  if (retrySec > 0) {
    return NextResponse.json(
      { error: 'Demasiados intentos', code: 'RATE_LIMITED', retryAfter: retrySec },
      { status: 429, headers }
    )
  }

  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos', code: 'MISSING_CREDENTIALS' },
        { status: 400, headers }
      )
    }

    const user = await verifyLoginCredentials(email, password)

    if (!user) {
      return NextResponse.json(
        { error: 'Credenciales inválidas', code: 'INVALID_CREDENTIALS' },
        { status: 401, headers }
      )
    }

    const { token, expiresAt } = await createLoginSession(user.userId)
    
    const trialExpiresAt = await getLoginTrialStatus(user.company_id) || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()

    const response = NextResponse.json({
      success: true,
      token,
      demo: false,
      user: {
        id: user.userId,
        name: user.name,
        email: user.email,
        company: user.company_name
      },
      trial_expires_at: trialExpiresAt
    }, { status: 200, headers })

    response.cookies.set('mc_token', token, {
      httpOnly: true,
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
      sameSite: 'strict'
    })

    return response

  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json(
      { error: 'Error al iniciar sesión', code: 'INTERNAL_ERROR' },
      { status: 500, headers }
    )
  }
}