/**
 * Task Service - Task CRUD + dispatch
 * Based on Polsia's app/services/task_service.py
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

export interface Task {
  id: string
  agent_type: string
  task_name: string
  description?: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  priority: 'low' | 'medium' | 'high'
  metadata?: Record<string, any>
  result?: string
  created_at: Date
  updated_at: Date
}

export interface CreateTaskInput {
  agent_type: string
  task_name: string
  description?: string
  priority?: 'low' | 'medium' | 'high'
  metadata?: Record<string, any>
  company_id?: string
}

export interface TaskFilters {
  status?: string
  agent_type?: string
  company_id?: string
  mission_id?: string
  limit?: number
}

/**
 * Create a new task
 */
export async function createTask(input: CreateTaskInput): Promise<Task> {
  const db = getPool()
  const id = randomUUID()
  
  const result = await db.query(
    `INSERT INTO mission_tasks (id, task_name, description, agent_id, priority, status, task_data, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, 'pending', $6, NOW(), NOW())
     RETURNING *`,
    [
      id,
      input.task_name,
      input.description || '',
      input.agent_type,
      input.priority || 'medium',
      JSON.stringify(input.metadata || {}),
    ]
  )
  
  return mapRowToTask(result.rows[0])
}

/**
 * Get task by ID
 */
export async function getTask(id: string): Promise<Task | null> {
  const db = getPool()
  const result = await db.query(
    'SELECT * FROM mission_tasks WHERE id = $1',
    [id]
  )
  return result.rows[0] ? mapRowToTask(result.rows[0]) : null
}

/**
 * List tasks with filters
 */
export async function listTasks(filters: TaskFilters = {}): Promise<Task[]> {
  const db = getPool()
  const { status, agent_type, company_id, mission_id, limit = 50 } = filters
  
  let query = 'SELECT * FROM mission_tasks WHERE 1=1'
  const params: any[] = []
  let paramIndex = 1
  
  if (status) {
    query += ` AND status = $${paramIndex++}`
    params.push(status)
  }
  if (agent_type) {
    query += ` AND agent_id = $${paramIndex++}`
    params.push(agent_type)
  }
  if (company_id) {
    query += ` AND company_id = $${paramIndex++}`
    params.push(company_id)
  }
  if (mission_id) {
    query += ` AND mission_id = $${paramIndex++}`
    params.push(mission_id)
  }
  
  query += ` ORDER BY created_at DESC LIMIT $${paramIndex++}`
  params.push(limit)
  
  const result = await db.query(query, params)
  return result.rows.map(mapRowToTask)
}

/**
 * Update task status
 */
export async function updateTaskStatus(
  id: string, 
  status: string,
  result?: string
): Promise<void> {
  const db = getPool()
  
  if (result) {
    await db.query(
      `UPDATE mission_tasks 
       SET status = $2, result = $3, updated_at = NOW()
       WHERE id = $1`,
      [id, status, result]
    )
  } else {
    await db.query(
      'UPDATE mission_tasks SET status = $2, updated_at = NOW() WHERE id = $1',
      [id, status]
    )
  }
}

/**
 * Get tasks for today summary
 */
export async function getTasksTodaySummary(companyId?: string): Promise<{
  total: number
  completed: number
  failed: number
  pending: number
}> {
  const db = getPool()
  
  const result = await db.query(`
    SELECT 
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE status = 'failed') as failed,
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) as total
    FROM mission_tasks 
    WHERE created_at::date = CURRENT_DATE
    ${companyId ? 'AND company_id = $1' : ''}
  `, companyId ? [companyId] : [])
  
  const row = result.rows[0]
  return {
    total: parseInt(row.total) || 0,
    completed: parseInt(row.completed) || 0,
    failed: parseInt(row.failed) || 0,
    pending: parseInt(row.pending) || 0,
  }
}

/**
 * Map DB row to Task interface
 */
function mapRowToTask(row: any): Task {
  return {
    id: row.id,
    agent_type: row.agent_id,
    task_name: row.task_name,
    description: row.description,
    status: row.status,
    priority: row.priority || 'medium',
    metadata: row.task_data,
    result: row.result,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}
