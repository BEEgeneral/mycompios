/**
 * Auth Login - Debug version with error logging
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

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos', code: 'MISSING' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    // Log env vars (without secrets)
    console.log('DATABASE_URL set:', !!process.env.DATABASE_URL)
    console.log('NEON_HOST set:', !!process.env.NEON_HOST)

    // Try to connect
    const sql = neon(process.env.DATABASE_URL!)

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
    console.error('Login error details:', err)
    return NextResponse.json(
      { 
        error: err.message, 
        code: 'SERVER_ERROR',
        stack: err.stack?.split('\n').slice(0, 3)
      },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}