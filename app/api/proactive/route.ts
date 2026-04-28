// PROACTIVE - Detect issues and create tasks automatically
import { NextResponse } from 'next/server'

const TRIGGERS = [
  { area: 'A1', name: 'pipeline_empty', cond: (v) => v < 5, agent: 'lucia', severity: 85, msg: 'Pipeline vacío - generar leads' },
  { area: 'A1', name: 'conversion_low', cond: (v) => v < 75, agent: 'lucia', severity: 85, msg: 'Conversión baja' },
  { area: 'A3', name: 'invoice_overdue', cond: (v) => v < 50, agent: 'carlos', severity: 95, msg: 'Facturas pendientes de cobro' },
  { area: 'A5', name: 'nps_low', cond: (v) => v < 75, agent: 'marcos', severity: 85, msg: 'NPS bajo - revisar satisfacción' },
  { area: 'A4', name: 'completion_low', cond: (v) => v < 75, agent: 'paco', severity: 75, msg: 'Tareas incompletas' }
]

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
    
    // Get health scores (no join needed)
    const scores = await pool.query(`
      SELECT company_id, area, health_score FROM health_scores
    `)
    
    const triggered = []
    
    // Group by company
    const byCompany = {}
    for (const s of scores.rows) {
      if (!byCompany[s.company_id]) byCompany[s.company_id] = []
      byCompany[s.company_id].push(s)
    }
    
    // Check triggers
    for (const [companyId, scoreList] of Object.entries(byCompany)) {
      for (const t of TRIGGERS) {
        const score = scoreList.find(s => s.area === t.area)
        if (!score) continue
        if (!t.cond(score.health_score)) continue
        
        // Check cooldown (24h)
        const existing = await pool.query(`
          SELECT id FROM proactive_triggers 
          WHERE company_id = $1 AND trigger_name = $2
          AND created_at > NOW() - INTERVAL '24 hours'
        `, [companyId, t.name])
        
        if (existing.rows.length > 0) continue
        
        // Create trigger
        await pool.query(`
          INSERT INTO proactive_triggers (id, company_id, area, trigger_name, status, created_at)
          VALUES ($1, $2, $3, $4, 'active', NOW())
        `, [require('crypto').randomUUID(), companyId, t.area, t.name])
        
        // Create task
        await pool.query(`
          INSERT INTO mission_tasks (id, company_id, agent_id, area, task_name, priority, status, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())
        `, [require('crypto').randomUUID(), companyId, t.agent, t.area, t.msg, t.severity])
        
        triggered.push({ company_id: companyId, trigger: t.name, agent: t.agent })
      }
    }
    
    await pool.end()
    
    return NextResponse.json({
      success: true,
      triggers_created: triggered.length,
      triggered
    }, { status: 200, headers })
    
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers })
  }
}