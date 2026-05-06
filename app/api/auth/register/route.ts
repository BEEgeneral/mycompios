export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const SALT = 'MYCOMPI_SALT_2026'
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

let _pool: Pool | null = null
function getPool() {
  if (!_pool) {
    _pool = new Pool({
      host: process.env.NEON_HOST,
      database: process.env.NEON_DB,
      user: process.env.NEON_USER,
      password: process.env.NEON_PASSWORD,
      ssl: true,
      max: 2,
    })
  }
  return _pool
}

export async function POST(req: NextRequest) {
  const pool = getPool()
  const headers = { ...CORS_HEADERS, 'Content-Type': 'application/json' }

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers })
  }

  const { email, password, name, company } = body

  if (!email || !password || !name || !company) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400, headers })
  }

  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400, headers })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: 'Invalid email format' }, { status: 400, headers })
  }

  try {
    const emailLower = email.toLowerCase()

    const existing = await pool.query(
      'SELECT id FROM app_user WHERE email = $1',
      [emailLower]
    )

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409, headers })
    }

    const companyId = crypto.randomUUID()
    await pool.query(
      `INSERT INTO companies (id, name, email, plan, trial_expires_at)
       VALUES ($1, $2, $3, 'trial', NOW() + INTERVAL '3 days')`,
      [companyId, company, emailLower]
    )

    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(password + SALT)
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    const userId = crypto.randomUUID()
    await pool.query(
      `INSERT INTO app_user (id, name, email, company_id, password_hash)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, name, emailLower, companyId, passwordHash]
    )

    const tokenBuffer = crypto.getRandomValues(new Uint8Array(32))
    const token = Array.from(tokenBuffer).map(b => b.toString(16).padStart(2, '0')).join('') + '_' + userId

    await pool.query(
      `INSERT INTO sessions (id, user_id, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
      [token, userId]
    )

    return NextResponse.json({
      success: true,
      userId,
      companyId,
      token
    }, { status: 200, headers })

  } catch (err: any) {
    console.error('Register error:', err)
    return NextResponse.json(
      { error: 'Registration failed', detail: err.message },
      { status: 500, headers }
    )
  }
}