export const runtime = 'nodejs'

/**
 * Auth Register - Main endpoint used by frontend
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

// Simple hash for password
function hashPassword(password: string): string {
  return Buffer.from(password + SALT).toString('hex')
}

export async function POST(req: NextRequest) {
  if (req.method === 'OPTIONS') {
    return new NextResponse('', { status: 200, headers: CORS_HEADERS })
  }

  try {
    const { name, email, password, company } = await req.json()

    if (!name || !email || !password || !company) {
      return NextResponse.json(
        { error: 'Nombre, email, contraseña y empresa son requeridos' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const emailLower = email.toLowerCase()
    const sql = neon(process.env.DATABASE_URL!)

    // Check if email exists
    const existing = await sql`
      SELECT id FROM app_user WHERE email = ${emailLower}
    `

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'El email ya está registrado' },
        { status: 409, headers: CORS_HEADERS }
      )
    }

    // Generate IDs
    const userId = crypto.randomUUID()
    const companyId = crypto.randomUUID()
    const passwordHash = hashPassword(password)
    const trialExpires = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()

    // Create company
    await sql`
      INSERT INTO companies (id, name, email, plan, trial_expires_at)
      VALUES (${companyId}, ${company}, ${emailLower}, 'trial', ${trialExpires})
    `

    // Create user
    await sql`
      INSERT INTO app_user (id, name, email, company_id, password_hash)
      VALUES (${userId}, ${name}, ${emailLower}, ${companyId}, ${passwordHash})
    `

    // Generate session token
    const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '') + '_' + userId
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    // Create session
    await sql`
      INSERT INTO sessions (id, user_id, created_at, expires_at)
      VALUES (${token}, ${userId}, ${new Date().toISOString()}, ${expiresAt})
    `

    const response = NextResponse.json({
      success: true,
      token,
      user: {
        id: userId,
        name,
        email: emailLower,
        company
      },
      company: {
        id: companyId,
        plan: 'trial',
        trial_expires_at: trialExpires
      }
    }, { status: 201, headers: CORS_HEADERS })

    // Set cookie
    response.cookies.set('mc_token', token, {
      httpOnly: true,
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
      sameSite: 'strict'
    })

    return response

  } catch (err: any) {
    console.error('Register error:', err)
    return NextResponse.json(
      { error: 'Error al registrarse' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}