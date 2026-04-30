// AUTH RESET PASSWORD - Send password reset email
import { NextResponse } from 'next/server'
import crypto, { randomBytes, randomUUID } from 'crypto'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = 'MyCompi <hello@mycompi.com>'

export async function POST(req: Request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  }

  if (req.method === 'OPTIONS') {
    return new NextResponse('', { status: 200, headers })
  }

  try {
    const { email } = await req.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400, headers })
    }

    const { Pool } = require('pg')
    const pool = new Pool({
      host: process.env.NEON_HOST,
      port: 5432,
      database: process.env.NEON_DB,
      user: process.env.NEON_USER,
      password: process.env.NEON_PASSWORD,
      ssl: true,
      max: 1,
    })

    // Check if user exists
    const userResult = await pool.query(
      'SELECT id, name FROM app_user WHERE email = $1',
      [email]
    )

    if (userResult.rows.length === 0) {
      await pool.end()
      // Return success anyway to prevent email enumeration
      return NextResponse.json({ success: true, sent: true }, { status: 200, headers })
    }

    const user = userResult.rows[0]

    // Generate reset token
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour

    // Store in a password_resets table or reuse sessions with type
    await pool.query(
      `DELETE FROM sessions WHERE token LIKE 'reset_%' AND user_id = $1`,
      [user.id]
    )

    await pool.query(
      `INSERT INTO sessions (id, user_id, token, created_at, expires_at)
       VALUES ($1, $2, $3, NOW(), $4)`,
      [crypto.randomUUID(), user.id, 'reset_' + token, expiresAt]
    )

    await pool.end()

    // Send email via Resend
    const resetUrl = `https://www.mycompi.com/nueva-password?token=${token}&email=${encodeURIComponent(email)}`

    const emailHtml = `
      <h1>¡Hola ${user.name}!</h1>
      <p>Has solicitado cambiar tu contraseña en MyCompi.</p>
      <p>Haz click en el siguiente enlace para crear una nueva contraseña:</p>
      <a href="${resetUrl}" style="display:inline-block;background:#2D3261;color:#FFD054;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Crear nueva contraseña</a>
      <p style="color:#666;font-size:14px;margin-top:20px;">Este enlace expira en 1 hora.</p>
      <p style="color:#666;font-size:14px;">Si no solicitaste este cambio, ignóralo.</p>
    `

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: email,
        subject: 'Cambia tu contraseña en MyCompi',
        html: emailHtml
      })
    })

    return NextResponse.json({ success: true, sent: true }, { status: 200, headers })

  } catch (err) {
    console.error('Reset password error:', err)
    return NextResponse.json({ error: err.message }, { status: 500, headers })
  }
}
