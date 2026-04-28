import { NextResponse } from 'next/server'
import crypto from 'crypto'

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

  try {
    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos', code: 'MISSING_CREDENTIALS' },
        { status: 400, headers }
      )
    }

    // Demo login - in production this would verify against a real DB
    const fakeUserId = crypto.randomUUID()
    const token = crypto.randomBytes(32).toString('hex')
    const trialExpiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()

    const response = NextResponse.json({
      success: true,
      token,
      demo: true,
      user: { id: fakeUserId, name: email.split('@')[0], email, company: 'Demo Company' },
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