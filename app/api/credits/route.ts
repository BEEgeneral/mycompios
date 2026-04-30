/**
 * Credits API - Get company credits
 * GET /api/credits?company_id=XXX
 */

import { NextResponse } from 'next/server'

function getDbPool() {
  const { Pool } = require('pg')
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

export async function GET(req: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  
  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('company_id')
    
    if (!companyId) {
      return NextResponse.json({ error: 'company_id required' }, { status: 400, headers })
    }
    
    const pool = getDbPool()
    
    // Get company credits
    const result = await pool.query(
      `SELECT credits_total, credits_used FROM companies WHERE id = $1`,
      [companyId]
    )
    
    await pool.end()
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404, headers })
    }
    
    const { credits_total = 5, credits_used = 0 } = result.rows[0]
    
    return NextResponse.json({
      credits: {
        total: credits_total,
        used: credits_used,
        remaining: credits_total - credits_used
      }
    }, { headers })
    
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500, headers })
  }
}