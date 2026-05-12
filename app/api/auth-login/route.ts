/**
 * Auth Login - Main endpoint used by frontend
 * Uses @neondatabase/serverless for Vercel Edge compatibility
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

// Simple hash for password verification
function hashPassword(password: string): string {
  const data = Buffer.from(password + SALT).toString('hex')
  return data
}

export async function POST(req: NextRequest) {
  if (req.method === 'OPTIONS') {
    return new NextResponse('', { status: 200, headers: CORS_HEADERS })
  }

  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    // Connect to database using DATABASE_URL env var
    const sql = neon(process.env.DATABASE_URL!)

    // Find user by email
    const users = await sql`
      SELECT u.id, u.name, u.email, u.company_id, u.password_hash,
             c.name as company_name, c.plan
      FROM app_user u
      JOIN companies c ON u.company_id = c.id
      WHERE u.email = ${email.toLowerCase()}
    `

    if (!users.length) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    const user = users[0]

    // Verify password
    const hash = hashPassword(password)
    if (user.password_hash !== hash) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    // Generate session token
    const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '') + '_' + user.id
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    // Create session
    await sql`
      INSERT INTO sessions (id, user_id, created_at, expires_at)
      VALUES (${token}, ${user.id}, ${new Date().toISOString()}, ${expiresAt})
    `

    const response = NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        company: user.company_name
      },
      plan: user.plan
    }, { status: 200, headers: CORS_HEADERS })

    // Set cookie
    response.cookies.set('mc_token', token, {
      httpOnly: true,
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
      sameSite: 'strict'
    })

    return response

  } catch (err: any) {
    console.error('Login error:', err)
    return NextResponse.json(
      { error: 'Error al iniciar sesión' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}