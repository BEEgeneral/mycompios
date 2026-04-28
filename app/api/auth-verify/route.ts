// AUTH VERIFY MAGIC LINK - Validate token and create session
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  }

  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')
    const email = searchParams.get('email')

    if (!token || !email) {
      return NextResponse.redirect(new URL('/login?error=invalid_token', req.url))
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

    // Find user and magic token
    const userResult = await pool.query(
      'SELECT id, name, company_id FROM app_user WHERE email = $1',
      [email]
    )

    if (userResult.rows.length === 0) {
      await pool.end()
      return NextResponse.redirect(new URL('/login?error=invalid_token', req.url))
    }

    const user = userResult.rows[0]

    // Check magic token exists and not expired
    const tokenResult = await pool.query(
      `SELECT id FROM sessions 
       WHERE user_id = $1 AND token = $2 AND expires_at > NOW() AND token LIKE 'magic_%'`,
      [user.id, 'magic_' + token]
    )

    if (tokenResult.rows.length === 0) {
      await pool.end()
      return NextResponse.redirect(new URL('/login?error=token_expired', req.url))
    }

    // Delete magic token
    await pool.query(
      'DELETE FROM sessions WHERE id = $1',
      [tokenResult.rows[0].id]
    )

    // Create new session
    const sessionToken = crypto.randomBytes(32).toString('hex') + '_' + user.id
    const sessionDuration = 30 * 24 * 60 * 60 * 1000

    await pool.query(
      `INSERT INTO sessions (id, user_id, token, created_at, expires_at)
       VALUES ($1, $2, $3, NOW(), $4)`,
      [crypto.randomUUID(), user.id, sessionToken, new Date(Date.now() + sessionDuration).toISOString()]
    )

    await pool.end()

    // Redirect to dashboard with token
    const response = NextResponse.redirect(new URL('/dashboard', req.url))
    response.cookies.set('mc_token', sessionToken, {
      httpOnly: true,
      path: '/',
      maxAge: sessionDuration,
      sameSite: 'lax'
    })

    return response

  } catch (err) {
    console.error('Verify error:', err)
    return NextResponse.redirect(new URL('/login?error=server_error', req.url))
  }
}
