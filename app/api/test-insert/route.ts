'use strict'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(req) {
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
    const { Pool } = require('pg')
    const pool = new Pool({
      host: process.env.NEON_HOST || 'ep-mute-mud-agxfgf1q-pooler.c-2.eu-central-1.aws.neon.tech',
      port: 5432,
      database: process.env.NEON_DB || 'neondb',
      user: process.env.NEON_USER || 'neondb_owner',
      password: process.env.NEON_PASSWORD || 'npg_WtabOh4u2KiL',
      ssl: { rejectUnauthorized: false },
      max: 1,
    })
    
    const now = new Date().toISOString()
    const testId = crypto.randomUUID()
    
    const r = await pool.query(
      `INSERT INTO companies (id, name, email, plan, created_at) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id`,
      [testId, 'Test Company', 'test@test.com', 'trial', now]
    )
    
    await pool.end()
    
    return NextResponse.json({ ok: true, inserted: r.rows[0].id })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message, code: err.code }, { status: 500 })
  }
}
