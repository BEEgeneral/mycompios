/**
 * Company Service - Context aggregation
 * Based on Polsia's app/services/company_service.py
 */

import { Pool } from 'pg'

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

export interface CompanyContext {
  company: {
    id: string
    name: string
    mission: string
    vision?: string
    industry?: string
    value_prop?: string
    target_market?: string
    pricing_model?: any
    goals?: any
    kpis?: any
    autonomy_mode: string
    credits_total: number
    credits_used: number
    current_phase: number
  }
  memory: MemoryEntry[]
  tasks: TaskSummary[]
  proposals: ProposalSummary[]
}

interface MemoryEntry {
  id: string
  entry_type: string
  title: string
  content: string
  tags: string[]
  created_at: Date
}

interface TaskSummary {
  id: string
  task_name: string
  status: string
  agent_id: string
}

interface ProposalSummary {
  id: string
  task_name: string
  status: string
}

/**
 * Get full company context for agent prompts
 */
export async function getFullContext(companyId?: string): Promise<CompanyContext> {
  const db = getPool()
  
  // Get company
  const companyQuery = companyId
    ? 'SELECT * FROM companies WHERE id = $1'
    : 'SELECT * FROM companies LIMIT 1'
  const companyResult = await db.query(
    companyQuery,
    companyId ? [companyId] : []
  )
  
  if (!companyResult.rows.length) {
    throw new Error('No company found')
  }
  
  const company = companyResult.rows[0]
  
  // Get recent memory
  const memoryResult = await db.query(
    `SELECT * FROM memory_entries 
     WHERE company_id = $1 
     ORDER BY created_at DESC LIMIT 20`,
    [company.id]
  )
  
  // Get pending tasks
  const tasksResult = await db.query(
    `SELECT id, task_name, status, agent_id 
     FROM mission_tasks 
     WHERE company_id = $1 
     ORDER BY created_at DESC LIMIT 10`,
    [company.id]
  )
  
  // Get pending proposals
  const proposalsResult = await db.query(
    `SELECT id, task_name, status 
     FROM proposals 
     WHERE company_id = $1 AND status = 'proposed'`,
    [company.id]
  )
  
  return {
    company: {
      id: company.id,
      name: company.name,
      mission: company.mission_statement || '',
      vision: company.vision,
      industry: company.industry,
      value_prop: company.value_prop,
      target_market: company.target_market,
      pricing_model: company.pricing_model,
      goals: company.goals,
      kpis: company.kpis,
      autonomy_mode: company.autonomy_mode || 'manual',
      credits_total: company.credits_total || 5,
      credits_used: company.credits_used || 0,
      current_phase: company.current_phase || 0,
    },
    memory: memoryResult.rows,
    tasks: tasksResult.rows,
    proposals: proposalsResult.rows,
  }
}

/**
 * Build context prompt for LLM
 */
export function buildContextPrompt(context: CompanyContext): string {
  const { company, memory, tasks, proposals } = context
  
  const lines = [
    `Empresa: ${company.name}`,
    `Misión: ${company.mission}`,
    `Autonomy: ${company.autonomy_mode}`,
    `Credits: ${company.credits_total - company.credits_used} restantes`,
    '',
    'Tareas pendientes:',
    ...tasks.filter(t => t.status === 'pending').map(t => `- [${t.status}] ${t.task_name} (${t.agent_id})`),
    '',
    'Propuestas pendientes:',
    ...proposals.map(p => `- [${p.status}] ${p.task_name}`),
    '',
    'Memoria reciente:',
    ...memory.slice(0, 5).map(m => `- [${m.entry_type}] ${m.content.substring(0, 100)}`),
  ]
  
  return lines.join('\n')
}

/**
 * Update company credits
 */
export async function updateCredits(
  companyId: string, 
  used: number
): Promise<void> {
  const db = getPool()
  await db.query(
    'UPDATE companies SET credits_used = credits_used + $2 WHERE id = $1',
    [companyId, used]
  )
}

/**
 * Get company by ID
 */
export async function getCompany(companyId: string): Promise<any | null> {
  const db = getPool()
  const result = await db.query(
    'SELECT * FROM companies WHERE id = $1',
    [companyId]
  )
  return result.rows[0] || null
}
