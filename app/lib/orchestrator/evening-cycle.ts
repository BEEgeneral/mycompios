/**
 * Evening Cycle - Polsia-style daily summary
 * 
 * Based on Polsia's celery_app/tasks/daily_cycle.py
 * Runs at 20:00 UTC:
 * 1. Aggregate day's task outcomes
 * 2. Generate evening summary
 * 3. Save daily report
 */

import { Pool } from 'pg'

// DB connection
function getPool() {
  return new Pool({
    host: process.env.NEON_HOST,
    port: 5432,
    database: process.env.NEON_DB,
    user: process.env.NEON_USER,
    password: process.env.NEON_PASSWORD,
    ssl: true,
  })
}

interface Company {
  id: string
  name: string
  mission_statement: string
  autonomy_mode: string
  credits_total: number
  credits_used: number
}

/**
 * Get today's task statistics
 */
async function getTodayStats(pool: Pool, companyId: string) {
  const result = await pool.query(`
    SELECT 
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE status = 'failed') as failed,
      COUNT(*) FILTER (WHERE status = 'pending') as pending
    FROM mission_tasks 
    WHERE company_id = $1 
    AND DATE(executed_at) = CURRENT_DATE
  `, [companyId])
  
  return result.rows[0] || { completed: 0, failed: 0, pending: 0 }
}

/**
 * Generate evening summary using LLM
 */
async function generateEveningSummary(
  company: Company,
  stats: { completed: number; failed: number; pending: number },
  plan?: string
): Promise<string> {
  const prompt = `Eres el Orchestrator de MyCompi. Son las 20:00 (8 PM).

Empresa: ${company.name}

RESUMEN DEL DÍA:
- Completadas: ${stats.completed}
- Fallidas: ${stats.failed}
- Pendientes: ${stats.pending}

${plan ? `PLAN DE LA MAÑANA:\n${plan}` : ''}

Genera el RESUMEN DE LA NOCHE:
1. Qué logramos hoy
2. Qué queda pendiente
3. Para mañana: prioridad #1

Máximo 100 palabras, en español.`

  const LLM_KEY = process.env.LLM_API_KEY || ''
  const LLM_URL = 'https://api.minimax.io/v1/text/chatcompletion_v2'
  const LLM_MODEL = 'MiniMax-M2.7'

  const res = await fetch(LLM_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LLM_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200
    })
  })
  
  const data = await res.json()
  return data?.choices?.[0]?.message?.content || 'Resumen no disponible'
}

/**
 * Save evening summary to memory
 */
async function saveEveningSummary(pool: Pool, companyId: string, summary: string, stats: any) {
  // Save to memory
  await pool.query(
    `INSERT INTO memory_entries (id, company_id, entry_type, title, content, tags, source)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      crypto.randomUUID(),
      companyId,
      'summary',
      'Evening Summary',
      summary,
      ['evening', 'orchestrator'],
      'orchestrator_cycle'
    ]
  )
  
  // Log activity
  await pool.query(
    `INSERT INTO activity_log (id, company_id, agent_type, action, summary, level)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      crypto.randomUUID(),
      companyId,
      'orchestrator',
      'evening_summary_sent',
      summary.substring(0, 100),
      'success'
    ]
  )
}

/**
 * Run evening cycle (called by Celery Beat)
 */
export async function runEveningCycle(companyId?: string): Promise<{ success: boolean; summary?: string; error?: string }> {
  console.log('[EveningCycle] Starting evening cycle', { companyId })
  
  const pool = getPool()
  
  try {
    // Get company
    const companyQuery = companyId 
      ? `SELECT * FROM companies WHERE id = $1 LIMIT 1`
      : `SELECT * FROM companies LIMIT 1`
    const companyResult = await pool.query(companyQuery, companyId ? [companyId] : [])
    
    if (!companyResult.rows.length) {
      throw new Error('No company found')
    }
    
    const company = companyResult.rows[0]
    
    // Get today's stats
    const stats = await getTodayStats(pool, company.id)
    
    // Get morning plan from memory
    const planResult = await pool.query(
      `SELECT content FROM memory_entries 
       WHERE company_id = $1 AND entry_type = 'plan' 
       ORDER BY created_at DESC LIMIT 1`,
      [company.id]
    )
    const morningPlan = planResult.rows[0]?.content
    
    // Generate summary
    const summary = await generateEveningSummary(company, stats, morningPlan)
    
    // Save summary
    await saveEveningSummary(pool, company.id, summary, stats)
    
    console.log('[EveningCycle] Summary generated')
    
    await pool.end()
    return { success: true, summary }
    
  } catch (error) {
    console.error('[EveningCycle] Error:', error)
    await pool.end()
    return { success: false, error: String(error) }
  }
}
