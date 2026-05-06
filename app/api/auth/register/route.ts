export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const SALT = 'MYCOMPI_SALT_2026'
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

let _sql: ReturnType<typeof neon> | null = null
function getSql() {
  if (!_sql) {
    _sql = neon(process.env.DATABASE_URL!)
  }
  return _sql
}

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

    const existingRaw = await sql`SELECT id FROM app_user WHERE email = ${emailLower}`
    const existing: any[] = Array.isArray(existingRaw) ? existingRaw : [existingRaw]

    if (existing.length > 0) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409, headers })
    }

    const companyId = crypto.randomUUID()
    await sql`
      INSERT INTO companies (id, name, email, plan, trial_expires_at)
      VALUES (
        ${companyId},
        ${company},
        ${emailLower},
        'trial',
        NOW() + INTERVAL '3 days'
      )
    `

    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(password + SALT)
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    const userId = crypto.randomUUID()
    await sql`
      INSERT INTO app_user (id, name, email, company_id, password_hash)
      VALUES (${userId}, ${name}, ${emailLower}, ${companyId}, ${passwordHash})
    `

    const tokenBuffer = crypto.getRandomValues(new Uint8Array(32))
    const token = Array.from(tokenBuffer).map(b => b.toString(16).padStart(2, '0')).join('') + '_' + userId

    await sql`
      INSERT INTO sessions (id, user_id, expires_at)
      VALUES (${token}, ${userId}, NOW() + INTERVAL '30 days')
    `

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