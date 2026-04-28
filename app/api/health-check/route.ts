// HEALTH CHECK - Populate health_scores
import { NextResponse } from 'next/server'

export async function GET() {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  try {
    const { Pool } = require('pg')
    const pool = new Pool({
      host: process.env.NEON_HOST,
      database: process.env.NEON_DB,
      user: process.env.NEON_USER,
      password: process.env.NEON_PASSWORD,
      ssl: true,
      max: 1,
    })
    
    const companies = await pool.query('SELECT id FROM companies LIMIT 20')
    const results = []
    
    for (const c of companies.rows) {
      const clients = await pool.query('SELECT COUNT(*)::int as cnt FROM fin_clients WHERE company_id = $1', [c.id])
      const invoices = await pool.query('SELECT SUM(total)::int as sum FROM fin_invoices WHERE company_id = $1', [c.id])
      
      const count = clients.rows[0]?.cnt || 0
      let stage = 'S0'
      if (count >= 100) stage = 'S4'
      else if (count >= 20) stage = 'S3'
      else if (count >= 5) stage = 'S2'
      else if (count >= 1) stage = 'S1'
      
      const areas = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8']
      for (const area of areas) {
        await pool.query(`
          INSERT INTO health_scores (company_id, area, health_score, last_updated)
          VALUES ($1, $2, 75, NOW())
          ON CONFLICT (company_id, area) DO UPDATE SET health_score = 75
        `, [c.id, area])
      }
      
      results.push({ company: c.id, stage, clients: count })
    }
    
    await pool.end()
    return NextResponse.json({ success: true, populated: results.length, results }, { status: 200, headers })
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500, headers })
  }
}
