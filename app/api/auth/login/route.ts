export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

// Password salt - must match register
const SALT = 'MYCOMPI_SALT_2026'

// CORS headers for frontend
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Lazy initialization - only when handler runs, not at build time
let _sql: ReturnType<typeof neon> | null = null
function getSql() {
  if (!_sql) {
    _sql = neon(process.env.DATABASE_URL!)
  }
  return _sql
}

// POST /api/auth/login
export async function POST(req: NextRequest) {
  const sql = getSql()
  const headers = { ...CORS_HEADERS, 'Content-Type': 'application/json' }

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers })
  }

  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405, headers })
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
      { error: 'Email and password are required', code: 'MISSING_CREDENTIALS' },
      { status: 400, headers }
    )
  }

  try {
    const emailLower = email.toLowerCase()

    const usersRaw = await sql`
      SELECT u.id, u.name, u.email, u.password_hash, u.company_id,
             c.name as company_name, c.plan, c.trial_expires_at
      FROM app_user u
      JOIN companies c ON u.company_id = c.id
      WHERE u.email = ${emailLower}
    `
    const users: any[] = Array.isArray(usersRaw) ? usersRaw : [usersRaw]

    if (!users.length) {
      return NextResponse.json(
        { error: 'Credenciales inválidas', code: 'INVALID_CREDENTIALS' },
        { status: 401, headers }
      )
    }

    const user = users[0]

    // Verify password
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

    // Create new session token
    const tokenBuffer = crypto.getRandomValues(new Uint8Array(32))
    const token = Array.from(tokenBuffer).map(b => b.toString(16).padStart(2, '0')).join('') + '_' + user.id

    // Store session
    await sql`
      INSERT INTO sessions (id, user_id, expires_at)
      VALUES (${token}, ${user.id}, NOW() + INTERVAL '30 days')
    `

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
    console.error('Login error:', err)
    return NextResponse.json(
      { error: 'Login failed', detail: err.message },
      { status: 500, headers }
    )
  }
}
