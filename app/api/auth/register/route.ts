'use strict'
import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import crypto from 'crypto'
import pg from 'pg'

const { Pool } = pg

export async function POST(req) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
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

  const { email, password, name, company } = body

  if (!email || !password || !name || !company) {
    return NextResponse.json(
      { error: 'Faltan campos requeridos', code: 'MISSING_FIELDS' },
      { status: 400, headers }
    )
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: 'La contraseña debe tener al menos 6 caracteres', code: 'WEAK_PASSWORD' },
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
    const now = new Date().toISOString()

    // Check if email exists
    const existing = await pool.query(
      'SELECT id FROM app_user WHERE LOWER(email) = LOWER($1)',
      [email]
    )

    if (existing.rows.length > 0) {
      await pool.end()
      return NextResponse.json(
        { error: 'Ya existe una cuenta con este email', code: 'EMAIL_EXISTS' },
        { status: 409, headers }
      )
    }

    // Create company
    const trialExpiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    const companyId = crypto.randomUUID()
    const apiKey = 'mc_' + crypto.randomUUID().replace(/-/g, '').substring(0, 24)

    await pool.query(
      `INSERT INTO companies (id, name, email, plan, trial_expires_at, api_key, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [companyId, company, email.toLowerCase(), 'trial', trialExpiresAt, apiKey, now]
    )

    // Hash password
    const salt = 'MYCOMPI_SALT_2026'
    const passwordHash = crypto.createHash('sha256').update(password + salt).digest('hex')

    // Create user
    const userId = crypto.randomUUID()
    const userResult = await pool.query(
      `INSERT INTO app_user (id, name, email, company_id, password_hash, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email`,
      [userId, name, email.toLowerCase(), companyId, passwordHash, now]
    )

    const userData = userResult.rows[0]

    // Generate session token
    const token = crypto.randomBytes(32).toString('hex') + '_' + userData.id
    const sessionDuration = 30 * 24 * 60 * 60 * 1000

    // Store session
    await pool.query(
      `INSERT INTO sessions (id, user_id, token, created_at, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [crypto.randomUUID(), userData.id, token, now, new Date(Date.now() + sessionDuration).toISOString()]
    )

    // Initialize trial_status
    await pool.query(
      `INSERT INTO trial_status (company_id, trial_expires_at, has_trial, trial_converted, messages_used_today, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [companyId, trialExpiresAt, true, false, 0, now]
    )

    await pool.end()

    const response = NextResponse.json(
      {
        success: true,
        userId: userData.id,
        companyId: companyId,
        token,
        trial_expires_at: trialExpiresAt,
        user: { id: userData.id, name: userData.name, email: userData.email }
      },
      { status: 200, headers }
    )

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      path: '/',
      maxAge: sessionDuration,
      sameSite: 'lax'
    })

    return response

  } catch (err) {
    await pool.end().catch(() => {})
    console.error('Registration error:', err)
    return NextResponse.json(
      { error: 'Error interno', code: 'INTERNAL_ERROR', detail: err.message },
      { status: 500, headers }
    )
  }
}
