/**
 * Morning Cycle - Polsia-style daily planning
 * 
 * Based on Polsia's celery_app/tasks/daily_cycle.py
 * Runs at 06:00 UTC:
 * 1. Get full company context
 * 2. Run finance snapshot (synchronous)
 * 3. Orchestrator generates plan
 * 4. Dispatch routine agents (social_media, customer_support)
 */

import { Pool } from 'pg'
import { AgentResult } from '../agents/base'
import { AGENT_MAP } from '../agents'

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

// LLM call
const LLM_KEY = process.env.LLM_API_KEY || ''
const LLM_URL = 'https://api.minimax.io/v1/text/chatcompletion_v2'
const LLM_MODEL = 'MiniMax-M2.7'

interface Company {
  id: string
  name: string
  mission_statement: string
  autonomy_mode: string
  credits_total: number
  credits_used: number
}

interface FullContext {
  company: Company
  memory: any[]
  tasks: any[]
  proposals: any[]
  kpis?: any
}

/**
 * Get full company context (like Polsia's get_full_context)
 */
async function getFullContext(pool: Pool, companyId?: string): Promise<FullContext> {
  const companyQuery = companyId 
    ? `SELECT * FROM companies WHERE id = $1 LIMIT 1`
    : `SELECT * FROM companies LIMIT 1`
  
  const companyResult = await pool.query(companyQuery, companyId ? [companyId] : [])
  if (!companyResult.rows.length) {
    throw new Error('No company found')
  }
  
  const company = companyResult.rows[0]
  
  // Get recent memory entries
  const memoryResult = await pool.query(
    `SELECT * FROM memory_entries ORDER BY created_at DESC LIMIT 10`
  )
  
  // Get pending tasks
  const tasksResult = await pool.query(
    `SELECT * FROM mission_tasks WHERE status IN ('pending', 'running') ORDER BY created_at DESC LIMIT 10`
  )
  
  // Get pending proposals
  const proposalsResult = await pool.query(
    `SELECT * FROM proposals WHERE status = 'proposed' LIMIT 5`
  )
  
  return {
    company,
    memory: memoryResult.rows,
    tasks: tasksResult.rows,
    proposals: proposalsResult.rows,
  }
}

/**
 * Generate morning plan using LLM (like Polsia's OrchestratorAgent)
 */
async function generateMorningPlan(context: FullContext): Promise<string> {
  const prompt = `Eres el Orchestrator de MyCompi. Son las 8:00 AM.

Empresa: ${context.company.name}
Misión: ${context.company.mission_statement || 'No definida'}

Tareas pendientes:
${context.tasks.map(t => `- [${t.status}] ${t.task_name}`).join('\n') || 'Ninguna'}

Propuestas pendientes:
${context.proposals.map(p => `- ${p.task_name}`).join('\n') || 'Ninguna'}

Memoria reciente:
${context.memory.slice(0, 5).map(m => `- ${m.content}`).join('\n') || 'Sin memoria'}

Credits: ${(context.company.credits_total || 5) - (context.company.credits_used || 0)} restantes

Genera el PLAN DE LA MAÑANA con:
1. Prioridad #1 - Por qué
2. Prioridad #2 - Por qué  
3. Si hay credits, propone 1 tarea adicional

Responde en máximo 150 palabras, en español.`

  const res = await fetch(LLM_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LLM_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300
    })
  })
  
  const data = await res.json()
  return data?.choices?.[0]?.message?.content || 'Plan no disponible'
}

/**
 * Save morning plan to memory
 */
async function saveMorningPlan(pool: Pool, companyId: string, plan: string) {
  await pool.query(
    `INSERT INTO memory_entries (id, company_id, entry_type, title, content, tags, source)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      crypto.randomUUID(),
      companyId,
      'plan',
      'Morning Plan',
      plan,
      ['morning', 'orchestrator'],
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
      'morning_plan_generated',
      plan.substring(0, 100),
      'success'
    ]
  )
}

/**
 * Run morning cycle (called by Celery Beat)
 */
export async function runMorningCycle(companyId?: string): Promise<{ success: boolean; plan?: string; error?: string }> {
  console.log('[MorningCycle] Starting morning cycle', { companyId })
  
  const pool = getPool()
  
  try {
    // Get context
    const context = await getFullContext(pool, companyId)
    
    // Generate plan
    const plan = await generateMorningPlan(context)
    
    // Save plan
    await saveMorningPlan(pool, context.company.id, plan)
    
    console.log('[MorningCycle] Plan generated:', plan.substring(0, 50))
    
    // Dispatch social_media and customer_support agents (if in auto/semi mode)
    if (context.company.autonomy_mode !== 'manual') {
      // Queue tasks for routine agents
      await pool.query(
        `INSERT INTO queued_tasks (id, queue, agent_type, task_name, priority, status)
         VALUES ($1, 'agents', 'social', 'Morning social sweep', 'medium', 'pending')`,
        [crypto.randomUUID()]
      )
    }
    
    await pool.end()
    
    return { success: true, plan }
    
  } catch (error) {
    console.error('[MorningCycle] Error:', error)
    await pool.end()
    return { success: false, error: String(error) }
  }
}
