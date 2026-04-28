'use strict'
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import pg from 'pg'

const { Pool } = pg

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

  const pool = new Pool({
    host: process.env.NEON_HOST,
    port: 5432,
    database: process.env.NEON_DB,
    user: process.env.NEON_USER,
    password: process.env.NEON_PASSWORD,
    ssl: { rejectUnauthorized: false },
    max: 1,
  })

  try {
    const users = await pool.query(
      'SELECT * FROM app_user WHERE LOWER(email) = LOWER($1)',
      [email]
    )

    if (users.rows.length === 0) {
      await pool.end()
      return NextResponse.json(
        { error: 'Credenciales inválidas', code: 'INVALID_CREDENTIALS' },
        { status: 401, headers }
      )
    }

    const user = users.rows[0]

    // Hash password check
    const salt = 'MYCOMPI_SALT_2026'
    const passwordHash = crypto.createHash('sha256').update(password + salt).digest('hex')

    if (user.password_hash !== passwordHash) {
      await pool.end()
      return NextResponse.json(
        { error: 'Credenciales inválidas', code: 'INVALID_CREDENTIALS' },
        { status: 401, headers }
      )
    }

    // Generate session token
    const token = crypto.randomBytes(32).toString('hex') + '_' + user.id
    const sessionDuration = 30 * 24 * 60 * 60 * 1000
    const now = new Date().toISOString()

    // Store session
    try {
      await pool.query(
        `INSERT INTO sessions (user_id, token, created_at, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [user.id, token, now, new Date(Date.now() + sessionDuration).toISOString()]
      )
    } catch (e) {
      console.log('Session insert warning:', e.message)
    }

    // Get trial status
    let trialInfo = { has_trial: true, trial_expires_at: null }
    try {
      const companies = await pool.query(
        'SELECT plan, trial_expires_at FROM companies WHERE LOWER(email) = LOWER($1)',
        [email]
      )
      if (companies.rows.length > 0) {
        const company = companies.rows[0]
        trialInfo = {
          has_trial: company.plan === 'trial',
          trial_expires_at: company.trial_expires_at
        }
      }
    } catch (e) {
      console.log('Trial info warning:', e.message)
    }

    await pool.end()

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
    await pool.end().catch(() => {})
    console.error('Login error:', err)
    return NextResponse.json(
      { error: 'Error al iniciar sesión', code: 'INTERNAL_ERROR', detail: err.message },
      { status: 500, headers }
    )
  }
}
