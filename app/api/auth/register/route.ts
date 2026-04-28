import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(req: Request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  }

  if (req.method === 'OPTIONS') {
    return new NextResponse('', { status: 200, headers })
  }

  try {
    const body = await req.json()
    const { email, password, name, company } = body

    if (!email || !password || !name || !company) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos', code: 'MISSING_FIELDS' },
        { status: 400, headers }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres', code: 'WEAK_PASSWORD' },
        { status: 400, headers }
      )
    }

    // Demo registration - in production this would connect to a real DB
    const fakeUserId = crypto.randomUUID()
    const fakeCompanyId = crypto.randomUUID()
    const token = crypto.randomBytes(32).toString('hex')
    const trialExpiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()

    const response = NextResponse.json({
      success: true,
      userId: fakeUserId,
      companyId: fakeCompanyId,
      token,
      trial_expires_at: trialExpiresAt,
      demo: true,
      user: { id: fakeUserId, name, email, company }
    }, { status: 200, headers })

    response.cookies.set('mc_token', token, {
      httpOnly: true,
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
      sameSite: 'lax'
    })

    return response

  } catch (err) {
    console.error('Register error:', err)
    return NextResponse.json(
      { error: 'Error interno', code: 'INTERNAL_ERROR' },
      { status: 500, headers }
    )
  }
}