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

export async function GET(req: Request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  }

  if (req.method === 'OPTIONS') {
    return new NextResponse('', { status: 200, headers })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 401, headers })
    }

    const pool = getDbPool()

    // Verify session
    const sessionResult = await pool.query(
      'SELECT user_id FROM sessions WHERE token = $1 AND expires_at > NOW()',
      [token]
    )

    if (sessionResult.rows.length === 0) {
      await pool.end()
      return NextResponse.json({ error: 'Sesion inválida' }, { status: 401, headers })
    }

    const userId = sessionResult.rows[0].user_id

    // Get user with company
    const userResult = await pool.query(
      'SELECT u.id, u.name, u.email, u.company_id, c.name as company_name FROM app_user u JOIN companies c ON u.company_id = c.id WHERE u.id = $1',
      [userId]
    )

    if (userResult.rows.length === 0) {
      await pool.end()
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404, headers })
    }

    const user = userResult.rows[0]

    // Get onboarding status
    const onboardingResult = await pool.query(
      'SELECT * FROM onboarding_data WHERE company_id = $1',
      [user.company_id]
    )

    // Get trial status
    const trialResult = await pool.query(
      'SELECT * FROM trial_status WHERE company_id = $1',
      [user.company_id]
    )

    await pool.end()

    const onboarding = onboardingResult.rows[0]
    const trial = trialResult.rows[0]

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        company_id: user.company_id,
        company_name: user.company_name
      },
      onboarding: onboarding ? {
        completed: onboarding.current_step === 3,
        empresa_nombre: onboarding.empresa_nombre,
        empresa_sector: onboarding.empresa_sector,
        empresa_web: onboarding.empresa_web,
        current_step: onboarding.current_step
      } : { completed: false, current_step: 0 },
      trial: trial ? {
        has_trial: trial.has_trial,
        trial_ends_at: trial.trial_ends_at,
        days_left: trial.trial_ends_at ? Math.max(0, Math.floor((new Date(trial.trial_ends_at).getTime() - Date.now()) / 86400000)) : 0
      } : null
    }, { status: 200, headers })

  } catch (err) {
    console.error('User status error:', err)
    return NextResponse.json(
      { error: 'Error interno', code: 'INTERNAL_ERROR' },
      { status: 500, headers }
    )
  }
}
