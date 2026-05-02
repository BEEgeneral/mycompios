/**
 * Pipeline - Mission and Task Management
 */

import { Pool } from 'pg'
import { randomUUID } from 'crypto'

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

export async function getActiveMissions(companyId: string): Promise<any[]> {
  const db = getPool()
  const result = await db.query(
    'SELECT * FROM client_missions WHERE company_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 10',
    [companyId, 'active']
  )
  await db.end()
  return result.rows
}

export async function shouldRunMission(companyId: string, missionId?: string): Promise<boolean> {
  const db = getPool()
  let result
  if (missionId) {
    result = await db.query(
      'SELECT last_run_at FROM client_missions WHERE id = $1 AND company_id = $2',
      [missionId, companyId]
    )
  } else {
    result = await db.query(
      'SELECT last_run_at FROM client_missions WHERE company_id = $1 AND status = $2',
      [companyId, 'active']
    )
  }
  await db.end()
  if (!result.rows[0]) return false
  
  const lastRun = result.rows[0].last_run_at
  if (!lastRun) return true
  
  const hoursSinceLastRun = (Date.now() - new Date(lastRun).getTime()) / (1000 * 60 * 60)
  return hoursSinceLastRun >= 24
}

export async function getPendingTasks(companyId: string, limit?: number): Promise<any[]> {
  const db = getPool()
  const result = await db.query(
    `SELECT * FROM client_tasks 
     WHERE company_id = $1 AND status IN ('pending', 'proposed')
     ORDER BY priority DESC, created_at ASC
     LIMIT $2`,
    [companyId, limit || 10]
  )
  await db.end()
  return result.rows
}

export async function touchMission(companyId: string, missionId?: string): Promise<void> {
  const db = getPool()
  if (missionId) {
    await db.query(
      'UPDATE client_missions SET last_run_at = NOW() WHERE id = $1 AND company_id = $2',
      [missionId, companyId]
    )
  } else {
    await db.query(
      'UPDATE client_missions SET last_run_at = NOW() WHERE company_id = $1',
      [companyId]
    )
  }
  await db.end()
}

export async function queueTask(queue: string, taskType: string, agentId?: string, priority?: string): Promise<string> {
  const db = getPool()
  const id = randomUUID()
  await db.query(
    `INSERT INTO queued_tasks (id, queue, task_type, payload, status, created_at)
     VALUES ($1, $2, $3, $4, 'pending', NOW())`,
    [id, queue, taskType, JSON.stringify({ agent_id: agentId, priority })]
  )
  await db.end()
  return id
}

export async function createDefaultMissions(companyId: string): Promise<void> {
  console.log('[Pipeline] Creating default missions for company:', companyId)
}