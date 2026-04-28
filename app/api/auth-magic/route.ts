// AUTH MAGIC LINK - Send magic link email
import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

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
      ssl: { rejectUnauthorized: false },
      max: 1,
    })

    // Check if user exists
    const userResult = await pool.query(
      'SELECT id, name, company_id FROM app_user WHERE email = $1',
      [email]
    )

    if (userResult.rows.length === 0) {
      await pool.end()
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404, headers })
    }

    const user = userResult.rows[0]

    // Generate magic token
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 min

    // Store token in sessions table with type 'magic'
    await pool.query(
      `INSERT INTO sessions (id, user_id, token, created_at, expires_at)
       VALUES ($1, $2, $3, NOW(), $4)`,
      [crypto.randomUUID(), user.id, 'magic_' + token, expiresAt]
    )

    await pool.end()

    // Send email via Resend
    const magicUrl = `https://www.mycompi.com/api/auth-verify?token=${token}&email=${encodeURIComponent(email)}`

    const emailHtml = `
      <h1>¡Hola ${user.name}!</h1>
      <p>Has solicitado acceder a MyCompi. Haz click en el siguiente enlace:</p>
      <a href="${magicUrl}" style="display:inline-block;background:#2D3261;color:#FFD054;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Entrar en MyCompi</a>
      <p style="color:#666;font-size:14px;margin-top:20px;">Este enlace expira en 15 minutos.</p>
      <p style="color:#666;font-size:14px;">Si no solicitaste este email, ignóralo.</p>
    `

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: email,
        subject: 'Tu enlace de acceso a MyCompi',
        html: emailHtml
      })
    })

    if (!resendRes.ok) {
      const err = await resendRes.text()
      console.error('Resend error:', err)
      return NextResponse.json({ error: 'Error enviando email' }, { status: 500, headers })
    }

    return NextResponse.json({ success: true, sent: true }, { status: 200, headers })

  } catch (err) {
    console.error('Magic link error:', err)
    return NextResponse.json({ error: err.message }, { status: 500, headers })
  }
}
