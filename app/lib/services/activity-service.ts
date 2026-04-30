/**
 * Activity Service - Logging + broadcast
 * Based on Polsia's app/services/activity_service.py
 */

import { Pool } from 'pg'
import { randomUUID } from 'crypto'

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

export type ActivityLevel = 'info' | 'success' | 'warning' | 'error'

export interface ActivityLog {
  id: string
  company_id: string
  agent_type: string
  action: string
  summary: string
  detail?: Record<string, any>
  level: ActivityLevel
  created_at: Date
}

/**
 * Log activity
 */
export async function logActivity(
  companyId: string,
  agentType: string,
  action: string,
  summary: string,
  level: ActivityLevel = 'info',
  detail?: Record<string, any>
): Promise<void> {
  const db = getPool()
  const id = randomUUID()
  
  await db.query(
    `INSERT INTO activity_log (id, company_id, agent_type, action, summary, detail, level, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    [
      id,
      companyId,
      agentType,
      action,
      summary.substring(0, 500),
      detail ? JSON.stringify(detail) : null,
      level,
    ]
  )
}

/**
 * Get recent activities
 */
export async function getRecentActivities(
  companyId: string,
  limit = 50
): Promise<ActivityLog[]> {
  const db = getPool()
  const result = await db.query(
    `SELECT * FROM activity_log 
     WHERE company_id = $1 
     ORDER BY created_at DESC 
     LIMIT $2`,
    [companyId, limit]
  )
  
  return result.rows
}

/**
 * Get activities by agent
 */
export async function getActivitiesByAgent(
  companyId: string,
  agentType: string,
  limit = 20
): Promise<ActivityLog[]> {
  const db = getPool()
  const result = await db.query(
    `SELECT * FROM activity_log 
     WHERE company_id = $1 AND agent_type = $2 
     ORDER BY created_at DESC 
     LIMIT $3`,
    [companyId, agentType, limit]
  )
  
  return result.rows
}

/**
 * Broadcast activity via WebSocket (future)
 * In production, this would publish to Redis pub/sub
 */
export async function broadcastActivity(activity: ActivityLog): Promise<void> {
  // TODO: Implement Redis pub/sub for real-time updates
  // For now, activities are stored in DB and polled by frontend
  console.log('[Activity]', activity.agent_type, activity.action, activity.summary)
}
