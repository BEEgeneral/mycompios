// CHECK USAGE - Verificar si empresa puede usar agentes
import { NextResponse } from 'next/server'

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

export async function POST(req) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    // Get company from session
    const sessionResult = await pool.query(
      'SELECT user_id FROM sessions WHERE token = $1 AND expires_at > NOW()',
      [token]
    )

    if (sessionResult.rows.length === 0) {
      await pool.end()
      return NextResponse.json({ error: 'Sesion invalida' }, { status: 401, headers })
    }

    const userResult = await pool.query(
      'SELECT company_id FROM app_user WHERE id = $1',
      [sessionResult.rows[0].user_id]
    )

    if (userResult.rows.length === 0) {
      await pool.end()
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404, headers })
    }

    const companyId = userResult.rows[0].company_id

    // Get trial status
    const trialResult = await pool.query(
      'SELECT * FROM trial_status WHERE company_id = $1',
      [companyId]
    )

    await pool.end()

    if (trialResult.rows.length === 0) {
      return NextResponse.json({ 
        allowed: false, 
        reason: 'no_trial',
        message: 'No tienes trial activo' 
      }, { status: 200, headers })
    }

    const trial = trialResult.rows[0]

    // Check if trial expired
    if (trial.trial_ends_at && new Date(trial.trial_ends_at) < new Date()) {
      return NextResponse.json({ 
        allowed: false, 
        reason: 'trial_expired',
        trial_ends_at: trial.trial_ends_at,
        message: 'Tu trial ha expirado' 
      }, { status: 200, headers })
    }

    // Check if churned/cancelled
    if (trial.churned) {
      return NextResponse.json({ 
        allowed: false, 
        reason: 'cancelled',
        message: 'Tu suscripcion ha sido cancelada' 
      }, { status: 200, headers })
    }

    // Check daily message limit (trial = 50 messages/day)
    const DAILY_LIMIT = 50
    if (trial.messages_used_today >= DAILY_LIMIT) {
      return NextResponse.json({ 
        allowed: false, 
        reason: 'daily_limit',
        messages_used_today: trial.messages_used_today,
        daily_limit: DAILY_LIMIT,
        message: 'Has alcanzado el limite de mensajes diarios' 
      }, { status: 200, headers })
    }

    // All checks passed
    const daysLeft = trial.trial_ends_at ? 
      Math.max(0, Math.floor((new Date(trial.trial_ends_at).getTime() - Date.now()) / 86400000)) : null
    return NextResponse.json({ 
      allowed: true, 
      messages_used_today: trial.messages_used_today,
      messages_remaining: DAILY_LIMIT - trial.messages_used_today,
      daily_limit: DAILY_LIMIT,
      trial_ends_at: trial.trial_ends_at,
      days_remaining: daysLeft
    }, { status: 200, headers })

  } catch (err) {
    console.error('Check usage error:', err)
    return NextResponse.json({ 
      success: false, 
      error: err.message 
    }, { status: 500, headers })
  }
}
