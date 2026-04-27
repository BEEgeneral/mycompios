// MyCompi Authentication - Login
// Migrated from InsForge (Deno) to Vercel (Node.js)

import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { query } from '../_lib/db'

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

  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Método no permitido' }, { status: 405, headers })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers })
  }

  const { email, password } = body

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email y contraseña son requeridos', code: 'MISSING_CREDENTIALS' },
      { status: 400, headers }
    )
  }

  try {
    const users = await query(
      'SELECT * FROM app_user WHERE LOWER(email) = LOWER($1)',
      [email]
    )

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Credenciales inválidas', code: 'INVALID_CREDENTIALS' },
        { status: 401, headers }
      )
    }

    const user = users[0]

    // Hash password check using Node.js crypto
    const salt = 'MYCOMPI_SALT_2026'
    const passwordHash = crypto.createHash('sha256').update(password + salt).digest('hex')

    if (user.password_hash !== passwordHash) {
      return NextResponse.json(
        { error: 'Credenciales inválidas', code: 'INVALID_CREDENTIALS' },
        { status: 401, headers }
      )
    }

    // Generate session token
    const tokenBuffer = crypto.randomBytes(32)
    const token = tokenBuffer.toString('hex') + '_' + user.id
    const sessionDuration = 30 * 24 * 60 * 60 * 1000
    const now = new Date().toISOString()

    // Store session
    try {
      await query(
        `INSERT INTO sessions (user_id, token, created_at, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [user.id, token, now, new Date(Date.now() + sessionDuration).toISOString()]
      )
    } catch (e) {
      console.log('Session insert warning:', e.message)
    }

    // Get trial status from company
    let trialInfo = { has_trial: true, trial_expires_at: null }
    try {
      const companies = await query(
        'SELECT plan, trial_expires_at FROM companies WHERE LOWER(email) = LOWER($1)',
        [email]
      )
      if (companies.length > 0) {
        const company = companies[0]
        trialInfo = {
          has_trial: company.plan === 'trial',
          trial_expires_at: company.trial_expires_at
        }
      }
    } catch (e) {
      console.log('Trial info lookup warning:', e.message)
    }

    const response = NextResponse.json(
      {
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          company: user.company
        },
        trial_expires_at: trialInfo.trial_expires_at,
        has_trial: trialInfo.has_trial
      },
      { status: 200, headers }
    )

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      path: '/',
      maxAge: sessionDuration,
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