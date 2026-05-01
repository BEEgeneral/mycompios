/**
 * Orchestrator Service - Morning/Evening cycles and planning
 */

import { Pool } from 'pg'
import { randomUUID } from 'crypto'

const LLM_URL = 'https://api.minimax.io/v1/text/chatcompletion_v2'
const LLM_MODEL = 'MiniMax-M2.7'
const LLM_KEY = process.env.LLM_API_KEY || ''

let pool: Pool | null = null

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.NEON_HOST,
      port: 5432,
      database: process.env.NEON_DB,
      user: process.env.NEON_USER,
      password: process.env.NEON_PASSWORD,
      ssl: true,
    })
  }
  return pool
}

export interface OrchestratorCompany {
  id: string
  name: string
  mission_statement: string | null
  current_phase: number
  credits_total: number
  credits_used: number
  autonomy_mode: string
}

export interface OrchestratorContext {
  company: OrchestratorCompany
  memory: any[]
  tasks: any[]
  proposals: any[]
}

export async function getFullOrchestratorContext(companyId: string): Promise<OrchestratorContext | null> {
  const db = getPool()
  const result = await db.query(
    'SELECT id, name, mission_statement, current_phase, credits_total, credits_used, autonomy_mode FROM companies WHERE id = $1',
    [companyId]
  )
  return result.rows[0] || null
}

export async function getContextMemories(companyId: string, limit = 5): Promise<any[]> {
  const db = getPool()
  const result = await db.query(
    'SELECT entry_type, content FROM memory_entries WHERE company_id = $1 ORDER BY created_at DESC LIMIT $2',
    [companyId, limit]
  )
  return result.rows
}

export async function getPendingTasks(companyId: string, limit = 10): Promise<any[]> {
  const db = getPool()
  const result = await db.query(
    `SELECT id, task_name, agent_id, status FROM mission_tasks 
     WHERE company_id = $1 AND status IN ('pending', 'running')
     ORDER BY created_at DESC LIMIT $2`,
    [companyId, limit]
  )
  return result.rows
}

export async function getProposals(companyId: string): Promise<any[]> {
  const db = getPool()
  const result = await db.query(
    'SELECT task_name, status FROM proposals WHERE company_id = $1 ORDER BY created_at DESC LIMIT 10',
    [companyId]
  )
  return result.rows
}

export async function logOrchestratorActivity(
  companyId: string,
  agentType: string,
  action: string,
  summary: string,
  level = 'info'
): Promise<void> {
  try {
    const db = getPool()
    await db.query(
      `INSERT INTO activity_log (id, company_id, agent_type, action, summary, level, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [randomUUID(), companyId, agentType, action, summary, level]
    )
  } catch (e) {
    console.error('Activity log error:', e)
  }
}

export async function callLLM(prompt: string): Promise<string> {
  try {
    const res = await fetch(LLM_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LLM_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300
      })
    })
    const data = await res.json()
    return data?.choices?.[0]?.message?.content || 'Plan no disponible'
  } catch (e) {
    return 'Error generando respuesta'
  }
}

export async function generateMorningPlan(context: OrchestratorContext): Promise<string> {
  const { company, memory, tasks, proposals } = context
  
  const prompt = `Eres el Orchestrator de MyCompi. Son las 8:00 AM.

Empresa: ${company.name}
Misión: ${company.mission_statement || 'No definida'}
Fase actual: ${company.current_phase || 0}

Contexto (últimas 5 entries de memoria):
${memory.map((m: any) => `- ${m.entry_type}: ${m.content}`).join('\n')}

Tareas pendientes:
${tasks.map((t: any) => `- [${t.status}] ${t.task_name} (agent: ${t.agent_id})`).join('\n')}

Propuestas pendientes:
${proposals.map((p: any) => `- [${p.status}] ${p.task_name}`).join('\n')}

Genera el PLAN DE LA MAÑANA en formato:
**Buenos días, ${company.name}!** ☀️

**Hoy se prioritizan:**
1. [Tarea más importante] - Por qué
2. [Segunda prioridad] - Por qué  
3. [Si hay tiempo] Tarea adicional

**Recuerda:**
- Credits disponibles: ${(company.credits_total || 5) - (company.credits_used || 0)}
- Modo actual: ${company.autonomy_mode || 'manual'}

Responde en español, máximo 200 palabras.`

  return await callLLM(prompt)
}

export async function generateEveningSummary(context: OrchestratorContext): Promise<string> {
  const { company, memory, tasks } = context
  
  const completedToday = tasks.filter((t: any) => 
    t.status === 'completed' && new Date(t.updated_at) > new Date(Date.now() - 86400000)
  )
  
  const prompt = `Eres el Orchestrator de MyCompi. Son las 20:00.

Empresa: ${company.name}

Resumen del día:
- Tareas completadas: ${completedToday.length}
${completedToday.map((t: any) => `  - ${t.task_name}`).join('\n')}

Tareas pendientes para mañana:
${tasks.filter((t: any) => t.status === 'pending').map((t: any) => `- ${t.task_name}`).join('\n')}

Genera el RESUMEN DE LA TARDE en formato:
**Buenas noches, ${company.name}!** 🌙

**Lo logrado hoy:**
- ${completedToday.length > 0 ? completedToday.map(t => t.task_name).join(', ') : 'Nada completado'}

**Mañana se prioriza:**
1. [Tarea principal]
2. [Segunda prioridad]

Responde en español, máximo 150 palabras.`

  return await callLLM(prompt)
}

