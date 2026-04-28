import { NextResponse } from 'next/server'
import crypto from 'crypto'

// Rate limiting
const loginLimits = new Map()
const LOGIN_MAX = 10
const LOGIN_WINDOW = 3600000

function checkLoginLimit(ip) {
  const now = Date.now()
  const r = loginLimits.get(ip) || { count: 0, resetAt: now + LOGIN_WINDOW }
  if (now > r.resetAt) { r.count = 0; r.resetAt = now + LOGIN_WINDOW }
  r.count++
  loginLimits.set(ip, r)
  if (r.count > LOGIN_MAX) return Math.ceil((r.resetAt - now) / 1000)
  return 0
}

function getDbPool() {
  const { Pool } = require('pg')
  return new Pool({
    host: process.env.NEON_HOST,
    port: 5432,
    database: process.env.NEON_DB,
    user: process.env.NEON_USER,
    password: process.env.NEON_PASSWORD,
    ssl: { rejectUnauthorized: false },
    max: 1,
  })
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

    const pool = getDbPool()

    // Find user
    const userResult = await pool.query(
      'SELECT id, email, name, company_id FROM app_user WHERE email = $1',
      [email]
    )

    if (userResult.rows.length === 0) {
      await pool.end()
      return NextResponse.json(
        { error: 'Credenciales inválidas', code: 'INVALID_CREDENTIALS' },
        { status: 401, headers }
      )
    }

    const user = userResult.rows[0]

    // Verify password
    const pwHash = crypto.createHash('sha256').update(password).digest('hex')
    const pwResult = await pool.query(
      'SELECT id FROM app_user WHERE email = $1 AND password_hash = $2',
      [email, pwHash]
    )

    if (pwResult.rows.length === 0) {
      await pool.end()
      return NextResponse.json(
        { error: 'Credenciales inválidas', code: 'INVALID_CREDENTIALS' },
        { status: 401, headers }
      )
    }

    // Create session
    const token = crypto.randomBytes(32).toString('hex') + '_' + user.id
    const sessionDuration = 30 * 24 * 60 * 60 * 1000

    await pool.query(
      `INSERT INTO sessions (id, user_id, token, created_at, expires_at)
       VALUES ($1, $2, $3, NOW(), $4)`,
      [crypto.randomUUID(), user.id, token, new Date(Date.now() + sessionDuration).toISOString()]
    )

    // Get company info
    const companyResult = await pool.query(
      'SELECT name FROM companies WHERE id = $1',
      [user.company_id]
    )

    // Get trial status
    const trialResult = await pool.query(
      'SELECT trial_ends_at, messages_used_today FROM trial_status WHERE company_id = $1',
      [user.company_id]
    )

    const trialExpiresAt = trialResult.rows[0]?.trial_ends_at || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()

    await pool.end()

    const response = NextResponse.json({
      success: true,
      token,
      demo: false,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        company: companyResult.rows[0]?.name || 'Unknown'
      },
      trial_expires_at: trialExpiresAt
    }, { status: 200, headers })

    response.cookies.set('mc_token', token, {
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
