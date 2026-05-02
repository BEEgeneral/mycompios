/**
 * Pipeline Check - Check due missions
 * GET /api/pipeline/check
 */

import { NextResponse } from 'next/server'
import { getActiveMissions } from '../../../lib/pipeline'

export async function GET() {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  
  try {
    const { Pool } = require('pg')
    const pool = new Pool({
      host: process.env.NEON_HOST,
      port: 5432,
      database: process.env.NEON_DB,
      user: process.env.NEON_USER,
      password: process.env.NEON_PASSWORD,
      ssl: true,
    })

    const companies = await pool.query('SELECT id FROM companies LIMIT 10')
    
    const dueMissions = []
    
    for (const company of companies.rows) {
      const missions = await getActiveMissions(company.id)
      for (const mission of missions) {
        const hoursSinceLastRun = mission.last_run_at 
          ? (Date.now() - new Date(mission.last_run_at).getTime()) / (1000 * 60 * 60)
          : 999
        if (hoursSinceLastRun >= 24) {
          dueMissions.push(mission)
        }
      }
    }
    
    await pool.end()
    
    return NextResponse.json({
      success: true,
      due_missions: dueMissions.length,
      missions: dueMissions
    }, { headers })
    
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500, headers })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } })
}
