import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  
  try {
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 401, headers })
    }

    const { Pool } = require('pg')
    const pool = new Pool({
      host: process.env.NEON_HOST,
      database: process.env.NEON_DB,
      user: process.env.NEON_USER,
      password: process.env.NEON_PASSWORD,
      ssl: true,
      max: 1,
    })

    // Get user from token
    const sessionResult = await pool.query(
      'SELECT user_id FROM sessions WHERE token = $1 AND expires_at > NOW()',
      [token]
    )

    if (sessionResult.rows.length === 0) {
      await pool.end()
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401, headers })
    }

    const userId = sessionResult.rows[0].user_id

    // Get user with company info
    const userResult = await pool.query(
      `SELECT u.id, u.email, u.name, u.company_id, 
              c.name as company_name, c.plan, c.mission_statement,
              c.current_phase, c.credits_total, c.credits_used,
              c.autonomy_mode, c.onboarding_status
       FROM app_user u
       JOIN companies c ON u.company_id = c.id
       WHERE u.id = $1`,
      [userId]
    )

    if (userResult.rows.length === 0) {
      await pool.end()
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404, headers })
    }

    const user = userResult.rows[0]

    await pool.end()

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        company_id: user.company_id,
        company_name: user.company_name,
        plan: user.plan || 'starter',
        mission_statement: user.mission_statement,
        current_phase: user.current_phase || 0,
        credits_remaining: (user.credits_total || 5) - (user.credits_used || 0),
        autonomy_mode: user.autonomy_mode || 'manual',
        onboarding_status: user.onboarding_status || 'pending'
      }
    }, { status: 200, headers })

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500, headers })
  }
}
