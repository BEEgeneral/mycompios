export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import { createHash, randomUUID } from 'crypto'

const SALT = 'MYCOMPI_SALT_2026'

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, company } = await req.json()

    if (!email || !password || !name || !company) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const pool = new Pool({
      host: process.env.NEON_HOST,
      port: 5432,
      database: process.env.NEON_DB,
      user: process.env.NEON_USER,
      password: process.env.NEON_PASSWORD,
      ssl: true,
    })

    // Check email
    const exists = await pool.query(
      'SELECT id FROM app_user WHERE LOWER(email) = LOWER($1)',
      [email]
    )
    if (exists.rows.length > 0) {
      await pool.end()
      return NextResponse.json({ error: 'Email exists' }, { status: 409 })
    }

    // Create company
    const companyId = randomUUID()
    const trialExpires = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    const apiKey = 'mc_' + randomUUID().replace(/-/g, '').substring(0, 24)
    
    await pool.query(
      `INSERT INTO companies (id, name, email, plan, trial_expires_at, api_key, created_at, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)`,
      [companyId, company, email.toLowerCase(), 'trial', trialExpires, apiKey, '{}']
    )

    // Create user
    const userId = randomUUID()
    const pwHash = createHash('sha256').update(password + SALT).digest('hex')
    const now = new Date().toISOString()

    const userResult = await pool.query(
      `INSERT INTO app_user (id, name, email, company_id, password_hash, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email`,
      [userId, name, email.toLowerCase(), companyId, pwHash, now]
    )

    // Create session
    const token = randomUUID() + '_' + userId
    await pool.query(
      `INSERT INTO sessions (id, user_id, created_at, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [randomUUID(), userId, now, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()]
    )

    // Init trial
    await pool.query(
      `INSERT INTO trial_status (company_id, trial_ends_at, has_trial, trial_converted, messages_used_today, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [companyId, trialExpires, true, false, 0, now]
    )

    await pool.end()

    return NextResponse.json({
      success: true,
      userId,
      companyId,
      token,
      trial_expires_at: trialExpires
    })

  } catch (err: any) {
    console.error('Register error:', err)
    return NextResponse.json({
      error: err.message,
      stack: err.stack?.slice(0, 500)
    }, { status: 500 })
  }
}