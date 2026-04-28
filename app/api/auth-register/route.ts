import { NextResponse } from 'next/server'
import crypto from 'crypto'

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
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  }

  if (req.method === 'OPTIONS') {
    return new NextResponse('', { status: 200, headers })
  }

  try {
    const { email, password, name, company, sector, vision } = await req.json()

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

    const pool = getDbPool()
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
      `INSERT INTO companies (id, name, email, plan, trial_expires_at, api_key, created_at, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [companyId, company, email.toLowerCase(), 'trial', trialExpiresAt, apiKey, now, JSON.stringify({ sector: sector || 'general', vision: vision || '' })]
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

    // Create session
    const token = crypto.randomBytes(32).toString('hex') + '_' + userData.id
    const sessionDuration = 30 * 24 * 60 * 60 * 1000

    await pool.query(
      `INSERT INTO sessions (id, user_id, token, created_at, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [crypto.randomUUID(), userData.id, token, now, new Date(Date.now() + sessionDuration).toISOString()]
    )

    // Initialize trial_status
    await pool.query(
      `INSERT INTO trial_status (company_id, trial_ends_at, has_trial, trial_converted, messages_used_today, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [companyId, trialExpiresAt, true, false, 0, now]
    )

    // Initialize email_sequence_status
    await pool.query(
      `INSERT INTO email_sequence_status (company_id, sequence, step, sent_at, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [companyId, 'welcome', 0, now, now]
    )

    await pool.end()

    // Send welcome email (async, don't wait)
    sendWelcomeEmail(email, company, name).catch(e => console.log('Email error:', e.message))

    const response = NextResponse.json({
      success: true,
      userId: userData.id,
      companyId: companyId,
      token,
      trial_expires_at: trialExpiresAt,
      onboarding_step: 1,
      user: { id: userData.id, name: userData.name, email: userData.email }
    }, { status: 200, headers })

    response.cookies.set('mc_token', token, {
      httpOnly: true,
      path: '/',
      maxAge: sessionDuration,
      sameSite: 'lax'
    })

    return response

  } catch (err) {
    console.error('Register error:', err)
    return NextResponse.json(
      { error: 'Error interno', code: 'INTERNAL_ERROR', detail: err.message },
      { status: 500, headers }
    )
  }
}

async function sendWelcomeEmail(email: string, companyName: string, nombre: string) {
  try {
    const html = buildWelcomeEmail(nombre, companyName)
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'MyCompi <onboarding@resend.dev>',
        to: [email],
        subject: `Bienvenido a MyCompi, ${nombre}!`,
        html
      })
    })
  } catch (e) {
    console.log('Email send error:', e.message)
  }
}

function buildWelcomeEmail(nombre: string, companyName: string) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Bienvenido a MyCompi</title></head><body style="margin:0;padding:0;background:#f4f4f4;font-family:'Poppins',Segoe UI,sans-serif;"><div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);"><div style="background:#2D3261;padding:32px 40px;"><div style="color:#FFD154;font-size:22px;font-weight:700;">Bienvenido/a ${nombre}!</div></div><div style="padding:36px 40px;"><p style="font-size:17px;color:#333;">Hola ${nombre},</p><p style="font-size:16px;color:#444;line-height:1.7;">Tu equipo de Compis esta listo. Tienes 3 dias de prueba gratis.</p><div style="text-align:center;margin:32px 0 0 0;"><a href="https://mycompios.vercel.app/dashboard" style="display:inline-block;background:#FFD054;color:#2D3261;font-weight:700;padding:14px 32px;border-radius:9999px;text-decoration:none;font-size:15px;">Ir al dashboard</a></div></div><div style="background:#f8f8f8;padding:20px 40px;text-align:center;"><p style="color:#999;font-size:12px;margin:0;">MyCompi - 49€/mes - Sin permanencia</p></div></div></body></html>`
}
