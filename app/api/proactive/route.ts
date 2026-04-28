// PROACTIVE - Automatic trigger detection and task creation
import { NextResponse } from 'next/server'

const TRIGGERS = [
  { area: 'A1', name: 'pipeline_empty', condition: (val) => val < 5, threshold: 5, agent: 'lucia', severity: 'high', message: 'Pipeline vacío - necesita leads' },
  { area: 'A1', name: 'conversion_low', condition: (val) => val < 30, threshold: 30, agent: 'lucia', severity: 'high', message: 'Conversión baja - revisar estrategia' },
  { area: 'A3', name: 'invoice_overdue', condition: (val) => val > 15, threshold: 15, agent: 'carlos', severity: 'critical', message: 'Facturas vencidas - cobrar urgente' },
  { area: 'A3', name: 'dso_high', condition: (val) => val > 45, threshold: 45, agent: 'carlos', severity: 'high', message: 'DSO alto - cashflow en riesgo' },
  { area: 'A5', name: 'nps_low', condition: (val) => val < 30, threshold: 30, agent: 'marcos', severity: 'high', message: 'NPS bajo - satisfacción en riesgo' },
  { area: 'A4', name: 'completion_low', condition: (val) => val < 70, threshold: 70, agent: 'paco', severity: 'medium', message: 'Tareas incompletas - revisar procesos' }
]

export async function GET(req: Request) {
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
    
    const triggered = []
    
    // Get companies with health_scores
    const scores = await pool.query(`
      SELECT hs.company_id, c.name as company, hs.area, hs.health_score
      FROM health_scores hs
      JOIN companies c ON c.id::text = hs.company_id
    `)
    
    // Group by company
    const byCompany = {}
    for (const row of scores.rows) {
      if (!byCompany[row.company_id]) byCompany[row.company_id] = { name: row.company, scores: [] }
      byCompany[row.company_id].scores.push({ area: row.area, score: row.health_score })
    }
    
    for (const [cid, data] of Object.entries(byCompany)) {
      for (const trigger of TRIGGERS) {
        const score = data.scores.find(s => s.area === trigger.area)
        if (!score) continue
        
        if (trigger.condition(score.score)) {
          // Check if not already triggered recently
          const existing = await pool.query(`
            SELECT id FROM proactive_triggers 
            WHERE company_id = $1 AND trigger_name = $2 
            AND status = 'active' 
            AND created_at > NOW() - INTERVAL '24 hours'
          `, [String(cid), trigger.name])
          
          if (existing.rows.length === 0) {
            // Create trigger
            await pool.query(`
              INSERT INTO proactive_triggers (id, company_id, area, trigger_name, threshold_value, current_value, status, created_at)
              VALUES ($1, $2, $3, $4, $5, $6, 'active', NOW())
            `, [
              require('crypto').randomUUID(),
              String(cid),
              trigger.area,
              trigger.name,
              JSON.stringify({ threshold: trigger.threshold }),
              JSON.stringify({ current: score.score, message: trigger.message })
            ])
            
            // Create task
            await pool.query(`
              INSERT INTO mission_tasks (id, company_id, agent_id, area, task_name, priority, status, health_trigger, created_at)
              VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, NOW())
            `, [
              require('crypto').randomUUID(),
              String(cid),
              trigger.agent,
              trigger.area,
              trigger.message,
              trigger.severity === 'critical' ? 95 : trigger.severity === 'high' ? 85 : 75,
              trigger.name
            ])
            
            triggered.push({
              company: data.name,
              trigger: trigger.name,
              agent: trigger.agent,
              message: trigger.message
            })
          }
        }
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