/**
 * Execute Service - Task execution via agents
 */

import { Pool } from 'pg'
import { randomUUID } from 'crypto'
// LLM imported inline - not exported from research-service

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

export interface AgentRunRecord {
  id: string
  task_id: string
  agent_type: string
  input_context: Record<string, any>
  output: Record<string, any>
  tokens_used: number
  cost_usd: number
  duration_secs: number
  status: 'running' | 'completed' | 'failed'
  started_at: Date
  ended_at?: Date
}

export async function createTaskAgentRun(
  taskId: string,
  agentType: string,
  inputContext: Record<string, any>
): Promise<string> {
  const db = getPool()
  const runId = randomUUID()
  
  await db.query(
    `INSERT INTO agent_runs (id, task_id, agent_type, input_context, status, started_at)
     VALUES ($1, $2, $3, $4, 'running', NOW())`,
    [runId, taskId, agentType, JSON.stringify(inputContext)]
  )
  
  return runId
}

export async function finishTaskAgentRun(
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

export async function updateMissionTaskStatus(
  taskId: string,
  status: string,
  result?: string
): Promise<void> {
  const db = getPool()
  
  if (result) {
    await db.query(
      `UPDATE mission_tasks SET status=$2, result=$3, updated_at=NOW() WHERE id=$1`,
      [taskId, status, result]
    )
  } else {
    await db.query(
      'UPDATE mission_tasks SET status=$2, updated_at=NOW() WHERE id=$1',
      [taskId, status]
    )
  }
}

export async function logAgentActivity(
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

export async function getMissionTask(taskId: string): Promise<any | null> {
  const db = getPool()
  const result = await db.query(
    'SELECT * FROM mission_tasks WHERE id = $1',
    [taskId]
  )
  return result.rows[0] || null
}

export async function getMissionTaskCompany(companyId: string): Promise<any | null> {
  const db = getPool()
  const result = await db.query(
    'SELECT * FROM companies WHERE id = $1',
    [companyId]
  )
  return result.rows[0] || null
}