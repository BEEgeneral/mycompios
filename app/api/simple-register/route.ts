export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import { createHash, randomUUID } from 'crypto'

const SALT = 'MYCOMPI_SALT_2026'

function getPool() {
  return new Pool({
    host: process.env.NEON_HOST,
    port: 5432,
    database: process.env.NEON_DB,
    user: process.env.NEON_USER,
    password: process.env.NEON_PASSWORD,
    ssl: true,
    max: 1,
  })
}

export async function POST(req: NextRequest) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  if (req.method === 'OPTIONS') {
    return new NextResponse('', { status: 200, headers })
  }

  let body
  try {
    body = await req.json()
  } catch (e: any) {
    const text = await req.text().catch(() => 'unknown')
    console.error('JSON parse error:', e.message, 'body:', text.slice(0, 200))
    return NextResponse.json({ error: 'Invalid JSON', detail: e.message }, { status: 400, headers })
  }

  const { email, password, name, company } = body || {}

  if (!email || !password || !name || !company) {
    return NextResponse.json({ error: 'Missing fields', received: { hasEmail: !!email, hasPassword: !!password, hasName: !!name, hasCompany: !!company } }, { status: 400, headers })
  }

  let pool
  let step = 'init'
  
  try {
    step = 'create-pool'
    pool = getPool()
    
    step = 'test-connection'
    const test = await pool.query('SELECT 1 as test')
    console.log('DB connection OK:', test.rows[0])

    step = 'check-email'
    const exists = await pool.query(
      'SELECT id FROM app_user WHERE LOWER(email) = LOWER($1)',
      [email]
    )
    console.log('Email exists check done:', exists.rows.length)
    
    if (exists.rows.length > 0) {
      await pool.end()
      return NextResponse.json({ error: 'Email exists' }, { status: 409, headers })
    }

    step = 'create-company'
    const companyId = randomUUID()
    const trialExpires = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    const apiKey = 'mc_' + randomUUID().replace(/-/g, '').substring(0, 24)
    
    await pool.query(
      `INSERT INTO companies (id, name, email, plan, trial_expires_at, api_key, created_at, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)`,
      [companyId, company, email.toLowerCase(), 'trial', trialExpires, apiKey, '{}']
    )
    console.log('Company created:', companyId)

    step = 'create-user'
    const userId = randomUUID()
    const pwHash = createHash('sha256').update(password + SALT).digest('hex')
    const now = new Date().toISOString()

    const userResult = await pool.query(
      `INSERT INTO app_user (id, name, email, company_id, password_hash, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email`,
      [userId, name, email.toLowerCase(), companyId, pwHash, now]
    )
    console.log('User created:', userResult.rows[0].id)

    step = 'create-session'
    const token = randomUUID() + '_' + userId
    await pool.query(
      `INSERT INTO sessions (id, user_id, created_at, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [randomUUID(), userId, now, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()]
    )
    console.log('Session created')

    step = 'init-trial'
    await pool.query(
      `INSERT INTO trial_status (company_id, trial_ends_at, has_trial, trial_converted, messages_used_today, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [companyId, trialExpires, true, false, 0, now]
    )
    console.log('Trial status created')

    await pool.end()

    return NextResponse.json({
      success: true,
      userId,
      companyId,
      token,
      trial_expires_at: trialExpires
    }, { headers })

  } catch (err: any) {
    console.error('Register error at step:', step, err.message)
    console.error('Stack:', err.stack?.slice(0, 500))
    if (pool) await pool.end().catch(() => {})
    // Return actual error for debugging
    return NextResponse.json({
      error: err.message,
      name: err.name,
      code: err.code,
      step: step,
      detail: err.stack?.slice(0, 500)
    }, { status: 500, headers })
  }
}