'use strict'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(req) {
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
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos', code: 'MISSING_CREDENTIALS' },
        { status: 400, headers }
      )
    }

    // Demo mode - create fake session without DB
    const fakeUserId = crypto.randomUUID()
    const token = crypto.randomBytes(32).toString('hex')
    const trialExpiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()

    const response = NextResponse.json({
      success: true,
      token,
      demo: true,
      user: { id: fakeUserId, name: email.split('@')[0], email }
    }, { status: 200, headers })

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
      sameSite: 'strict'
    })

    return response

  } catch (err) {
    return NextResponse.json(
      { error: 'Error al iniciar sesión', code: 'INTERNAL_ERROR' },
      { status: 500, headers }
    )
  }
}