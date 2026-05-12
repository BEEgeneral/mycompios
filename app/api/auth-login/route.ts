export const runtime = 'nodejs'

/**
 * Auth Login - Using connection string like test-neon does
 */
import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
}

const SALT = 'MYCOMPI_SALT_2026'

function hashPassword(password: string): string {
  return Buffer.from(password + SALT).toString('hex')
}

function getConnectionString() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL
  }
  // Fallback to individual vars (Vercel format)
  return `postgresql://${process.env.NEON_USER}:${process.env.NEON_PASSWORD}@${process.env.NEON_HOST}/${process.env.NEON_DB}?ssl=true`
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos', code: 'MISSING' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const sql = neon(getConnectionString())

    const users = await sql`
      SELECT u.id, u.name, u.email, u.company_id, u.password_hash,
             c.name as company_name, c.plan
      FROM app_user u
      JOIN companies c ON u.company_id = c.id
      WHERE u.email = ${email.toLowerCase()}
    `

    if (!users.length) {
      return NextResponse.json(
        { error: 'Credenciales inválidas', code: 'NOT_FOUND' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    const user = users[0]
    const hash = hashPassword(password)

    if (user.password_hash !== hash) {
      return NextResponse.json(
        { error: 'Credenciales inválidas', code: 'BAD_PASSWORD' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '') + '_' + user.id
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    await sql`
      INSERT INTO sessions (id, user_id, created_at, expires_at)
      VALUES (${token}, ${user.id}, ${new Date().toISOString()}, ${expiresAt})
    `

    return NextResponse.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email }
    }, { status: 200, headers: CORS_HEADERS })

  } catch (err: any) {
    console.error('Login error:', err.message)
    return NextResponse.json(
      { error: err.message, code: 'SERVER_ERROR' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}