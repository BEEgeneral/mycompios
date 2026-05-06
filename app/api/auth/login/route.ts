export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const SALT = 'MYCOMPI_SALT_2026'
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function POST(req: NextRequest) {
  const headers = { ...CORS_HEADERS, 'Content-Type': 'application/json' }

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers })
  }

  try {
    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required', code: 'MISSING_CREDENTIALS' },
        { status: 400, headers }
      )
    }

    // Create pool inline (like test-db)
    const pool = new Pool({
      host: process.env.NEON_HOST,
      database: process.env.NEON_DB,
      user: process.env.NEON_USER,
      password: process.env.NEON_PASSWORD,
      ssl: true,
      max: 2,
    })

    const emailLower = email.toLowerCase()

    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.password_hash, u.company_id,
              c.name as company_name, c.plan, c.trial_expires_at
       FROM app_user u
       JOIN companies c ON u.company_id = c.id
       WHERE u.email = $1`,
      [emailLower]
    )

    await pool.end()

    const users: any[] = result.rows
    if (!users.length) {
      return NextResponse.json(
        { error: 'Credenciales inválidas', code: 'INVALID_CREDENTIALS' },
        { status: 401, headers }
      )
    }

    const user = users[0]

    // Hash password
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(password + SALT)
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    if (user.password_hash !== passwordHash) {
      return NextResponse.json(
        { error: 'Credenciales inválidas', code: 'INVALID_CREDENTIALS' },
        { status: 401, headers }
      )
    }

    // Create new pool for session insert
    const pool2 = new Pool({
      host: process.env.NEON_HOST,
      database: process.env.NEON_DB,
      user: process.env.NEON_USER,
      password: process.env.NEON_PASSWORD,
      ssl: true,
      max: 1,
    })

    const tokenBuffer = crypto.getRandomValues(new Uint8Array(32))
    const token = Array.from(tokenBuffer).map(b => b.toString(16).padStart(2, '0')).join('') + '_' + user.id

    await pool2.query(
      `INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
      [token, user.id]
    )

    await pool2.end()

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        companyId: user.company_id,
        companyName: user.company_name,
        plan: user.plan,
        trialExpiresAt: user.trial_expires_at
      },
      token
    }, { status: 200, headers })

  } catch (err: any) {
    console.error('Login error:', err.message)
    return NextResponse.json(
      { error: 'Login failed', detail: err.message },
      { status: 500, headers }
    )
  }
}