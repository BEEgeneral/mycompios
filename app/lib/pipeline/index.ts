/**
 * Task Pipeline - Connects orchestrator, missions, and execution
 * Polsia-style: orchestrator → missions → tasks → agent execution
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

export interface Mission {
  id: string
  company_id: string
  name: string
  status: 'active' | 'paused' | 'completed'
  agent_type: string
  schedule: string // cron expression
  last_run?: Date
  next_run?: Date
}

export interface QueuedTask {
  id: string
  mission_id: string
  task_name: string
  agent_type: string
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'running' | 'completed' | 'failed'
  scheduled_for: Date
  result?: string
}

/**
 * Create mission for company with agent
 */
export async function createMission(
  companyId: string,
  name: string,
  agentType: string,
  schedule: string
): Promise<Mission> {
  const pool = getPool()
  const id = randomUUID()
  
  const result = await pool.query(
    `INSERT INTO missions (id, company_id, name, agent_id, status, schedule, created_at)
     VALUES ($1, $2, $3, $4, 'active', $5, NOW())
     RETURNING *`,
    [id, companyId, name, agentType, schedule]
  )
  
  await pool.end()
  return result.rows[0]
}

/**
 * Queue task for mission
 */
export async function queueTask(
  missionId: string,
  taskName: string,
  agentType: string,
  priority: 'low' | 'medium' | 'high' = 'medium',
  scheduledFor?: Date
): Promise<string> {
  const pool = getPool()
  const id = randomUUID()
  
  await pool.query(
    `INSERT INTO mission_tasks (id, mission_id, task_name, agent_id, priority, status, scheduled_for, created_at)
     VALUES ($1, $2, $3, $4, $5, 'pending', $6, NOW())`,
    [id, missionId, taskName, agentType, priority, scheduledFor || new Date()]
  )
  
  await pool.end()
  return id
}

/**
 * Get pending tasks for execution
 */
export async function getPendingTasks(limit = 10): Promise<any[]> {
  const pool = getPool()
  
  const result = await pool.query(`
    SELECT mt.*, m.company_id, m.name as mission_name
    FROM mission_tasks mt
    JOIN missions m ON m.id = mt.mission_id
    WHERE mt.status = 'pending'
    AND mt.scheduled_for <= NOW()
    AND m.status = 'active'
    ORDER BY mt.priority DESC, mt.scheduled_for ASC
    LIMIT $1
  `, [limit])
  
  await pool.end()
  return result.rows
}

/**
 * Get active missions for company
 */
export async function getActiveMissions(companyId: string): Promise<Mission[]> {
  const pool = getPool()
  
  const result = await pool.query(
    'SELECT * FROM missions WHERE company_id = $1 AND status = $2',
    [companyId, 'active']
  )
  
  await pool.end()
  return result.rows
}

/**
 * Update mission last_run timestamp
 */
export async function touchMission(missionId: string): Promise<void> {
  const pool = getPool()
  
  await pool.query(
    'UPDATE missions SET last_run = NOW() WHERE id = $1',
    [missionId]
  )
  
  await pool.end()
}

/**
 * Check if mission should run (based on schedule)
 */
export function shouldRunMission(mission: Mission): boolean {
  if (mission.status !== 'active') return false
  if (!mission.next_run) return true
  return new Date() >= new Date(mission.next_run)
}

/**
 * Create default mission template
 */
export async function createDefaultMissions(companyId: string): Promise<void> {
  const pool = getPool()
  
  const missions = [
    { name: 'Daily Planning', agent: 'paco', schedule: '0 6 * * *' },      // 06:00 UTC
    { name: 'Social Media', agent: 'social', schedule: '0 */2 * * *' },   // Every 2h
    { name: 'Email Processing', agent: 'support', schedule: '0 */3 * * *' }, // Every 3h
    { name: 'Evening Summary', agent: 'paco', schedule: '0 20 * * *' },    // 20:00 UTC
    { name: 'Ads Sync', agent: 'finance', schedule: '0 */6 * * *' },      // Every 6h
  ]
  
  for (const m of missions) {
    const id = randomUUID()
    await pool.query(
      `INSERT INTO missions (id, company_id, name, agent_id, status, schedule, created_at)
       VALUES ($1, $2, $3, $4, 'active', $5, NOW())
       ON CONFLICT DO NOTHING`,
      [id, companyId, m.name, m.agent, m.schedule]
    )
  }
  
  await pool.end()
}