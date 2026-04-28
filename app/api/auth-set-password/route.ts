// AUTH SET PASSWORD - Set new password from reset token
import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

export async function POST(req: Request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  }

  if (req.method === 'OPTIONS') {
    return new NextResponse('', { status: 200, headers })
  }

  try {
    const { token, email, password } = await req.json()

    if (!token || !email || !password) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400, headers })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Contraseña muy corta' }, { status: 400, headers })
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

    // Find user
    const userResult = await pool.query(
      'SELECT id FROM app_user WHERE email = $1',
      [email]
    )

    if (userResult.rows.length === 0) {
      await pool.end()
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404, headers })
    }

    const userId = userResult.rows[0].id

    // Verify reset token
    const tokenResult = await pool.query(
      `SELECT id FROM sessions 
       WHERE user_id = $1 AND token = $2 AND expires_at > NOW() AND token LIKE 'reset_%'`,
      [userId, 'reset_' + token]
    )

    if (tokenResult.rows.length === 0) {
      await pool.end()
      return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 400, headers })
    }

    // Hash password and update
    const pwHash = crypto.createHash('sha256').update(password).digest('hex')
    
    await pool.query(
      'UPDATE app_user SET password_hash = $1 WHERE id = $2',
      [pwHash, userId]
    )

    // Delete reset token
    await pool.query(
      'DELETE FROM sessions WHERE id = $1',
      [tokenResult.rows[0].id]
    )

    // Create new session
    const sessionToken = randomBytes(32).toString('hex') + '_' + userId
    const sessionDuration = 30 * 24 * 60 * 60 * 1000

    await pool.query(
      `INSERT INTO sessions (id, user_id, token, created_at, expires_at)
       VALUES ($1, $2, $3, NOW(), $4)`,
      [randomBytes(4).toString('hex'), userId, sessionToken, new Date(Date.now() + sessionDuration).toISOString()]
    )

    await pool.end()

    const response = NextResponse.json({ success: true }, { status: 200, headers })
    response.cookies.set('mc_token', sessionToken, {
      httpOnly: true,
      path: '/',
      maxAge: sessionDuration,
      sameSite: 'lax'
    })

    return response

  } catch (err) {
    console.error('Set password error:', err)
    return NextResponse.json({ error: err.message }, { status: 500, headers })
  }
}
