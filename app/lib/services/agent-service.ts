/**
 * Agent Service - Agent runs and heartbeats
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

export interface AgentRun {
  id: string
  agent_type: string
  status: string
  created_at: Date
  completed_at?: Date
  result_summary?: string
}

export interface AgentHeartbeat {
  agent_type: string
  status: string
  last_run_at: Date | null
  last_run_status: string | null
  tasks_today: number
  health: string
}

const AGENT_TYPES = [
  'paco', 'research', 'sales', 'finance', 'code', 'social', 'support', 
  'business_planning', 'ads_management'
]

export async function getAgentRuns(companyId?: string, hours = 24): Promise<AgentRun[]> {
  const db = getPool()
  
  let query = `
    SELECT agent_type, status, created_at, completed_at, result_summary
    FROM agent_runs 
    WHERE created_at > NOW() - INTERVAL '${hours} hours'
  `
  const params: any[] = []
  
  if (companyId) {
    query += ' AND company_id = $1'
    params.push(companyId)
  }
  
  query += ' ORDER BY created_at DESC LIMIT 50'
  
  const result = await db.query(query, params)
  return result.rows
}

export async function getAgentHeartbeats(companyId?: string): Promise<AgentHeartbeat[]> {
  const runs = await getAgentRuns(companyId)
  
  return AGENT_TYPES.map(agentType => {
    const agentRuns = runs.filter(r => r.agent_type === agentType)
    const lastRun = agentRuns[0]
    
    return {
      agent_type: agentType,
      status: lastRun?.status || 'idle',
      last_run_at: lastRun?.created_at || null,
      last_run_status: lastRun?.status || null,
      tasks_today: agentRuns.length,
      health: 'healthy'
    }
  })
}

export async function createAgentRun(
  taskId: string,
  agentType: string,
  inputContext: Record<string, any>
): Promise<string> {
  const db = getPool()
  const id = require('crypto').randomUUID()
  
  await db.query(
    `INSERT INTO agent_runs (id, task_id, agent_type, input_context, status, started_at)
     VALUES ($1, $2, $3, $4, 'running', NOW())`,
    [id, taskId, agentType, JSON.stringify(inputContext)]
  )
  
  return id
}

export async function finishAgentRun(
  runId: string,
  status: string,
  output: Record<string, any>,
  tokensUsed: number,
  costUsd: number,
  durationSecs: number
): Promise<void> {
  const db = getPool()
  
  await db.query(
    `UPDATE agent_runs 
     SET status=$1, output=$2, tokens_used=$3, cost_usd=$4, duration_secs=$5, ended_at=NOW()
     WHERE id=$6`,
    [status, JSON.stringify(output), tokensUsed, costUsd, durationSecs, runId]
  )
}