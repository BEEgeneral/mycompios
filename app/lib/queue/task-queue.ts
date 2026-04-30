/**
 * Task Queue Service
 * 
 * Manages the task queue with PostgreSQL persistence.
 * Based on Polsia's task_service.py
 */

import { randomUUID } from 'crypto'
import { Pool } from 'pg'
import {
  QueuedTask,
  CreateTaskOptions,
  TaskPriority,
  QueueName,
  TaskStatus,
  QueueStats,
  DEFAULT_MAX_RETRIES
} from './types'

// Database pool singleton
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
      max: 10,
    })
  }
  return pool
}

/**
 * Create a new queued task
 */
export async function createQueuedTask(options: CreateTaskOptions): Promise<QueuedTask> {
  const pool = getPool()
  const id = randomUUID()
  const {
    queue = 'agents',
    agentType,
    taskName,
    description,
    priority = 'medium',
    metadata,
    scheduledFor
  } = options

  const task: QueuedTask = {
    id,
    queue,
    agentType,
    taskName,
    description,
    priority,
    status: 'pending',
    metadata,
    createdAt: new Date(),
    scheduledFor,
    retries: 0,
    maxRetries: DEFAULT_MAX_RETRIES
  }

  await pool.query(
    `INSERT INTO queued_tasks (id, queue, agent_type, task_name, description, priority, status, metadata, created_at, scheduled_for, retries, max_retries)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      task.id,
      task.queue,
      task.agentType,
      task.taskName,
      task.description,
      task.priority,
      task.status,
      JSON.stringify(task.metadata || {}),
      task.createdAt,
      task.scheduledFor,
      task.retries,
      task.maxRetries
    ]
  )

  return task
}

/**
 * Get next pending task from a queue
 */
export async function dequeueTask(queueName: QueueName): Promise<QueuedTask | null> {
  const pool = getPool()
  
  // Get oldest pending task
  const result = await pool.query(
    `SELECT * FROM queued_tasks 
     WHERE queue = $1 AND status = 'pending' 
     AND (scheduled_for IS NULL OR scheduled_for <= NOW())
     ORDER BY 
       CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
       created_at ASC
     LIMIT 1`,
    [queueName]
  )

  if (result.rows.length === 0) return null

  const row = result.rows[0]
  return mapRowToTask(row)
}

/**
 * Mark task as queued (picked up by worker)
 */
export async function markTaskQueued(taskId: string): Promise<void> {
  const pool = getPool()
  await pool.query(
    `UPDATE queued_tasks SET status = 'queued', started_at = NOW() WHERE id = $1`,
    [taskId]
  )
}

/**
 * Mark task as running
 */
export async function markTaskRunning(taskId: string): Promise<void> {
  const pool = getPool()
  await pool.query(
    `UPDATE queued_tasks SET status = 'running' WHERE id = $1`,
    [taskId]
  )
}

/**
 * Mark task as completed
 */
export async function markTaskCompleted(
  taskId: string, 
  result: any
): Promise<void> {
  const pool = getPool()
  await pool.query(
    `UPDATE queued_tasks 
     SET status = 'completed', completed_at = NOW(), result = $2 
     WHERE id = $1`,
    [taskId, JSON.stringify(result)]
  )
}

/**
 * Mark task as failed and handle retry
 */
export async function markTaskFailed(
  taskId: string, 
  error: string
): Promise<boolean> {
  const pool = getPool()
  
  // Get current task
  const result = await pool.query(
    `SELECT retries, max_retries FROM queued_tasks WHERE id = $1`,
    [taskId]
  )
  
  if (result.rows.length === 0) return false
  
  const task = result.rows[0]
  const shouldRetry = task.retries < task.max_retries
  
  if (shouldRetry) {
    // Increment retry count and reset status
    await pool.query(
      `UPDATE queued_tasks 
       SET status = 'pending', retries = retries + 1, error = $2 
       WHERE id = $1`,
      [taskId, error]
    )
  } else {
    // Max retries reached, mark as failed permanently
    await pool.query(
      `UPDATE queued_tasks 
       SET status = 'failed', error = $2, completed_at = NOW() 
       WHERE id = $1`,
      [taskId, error]
    )
  }
  
  return shouldRetry
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<QueueStats> {
  const pool = getPool()
  
  const result = await pool.query(
    `SELECT queue, status, COUNT(*) as count 
     FROM queued_tasks 
     WHERE status IN ('pending', 'queued', 'running')
     GROUP BY queue, status`
  )
  
  const stats: QueueStats = {
    scheduler: { pending: 0, running: 0 },
    agents: { pending: 0, running: 0 },
    maintenance: { pending: 0, running: 0 }
  }
  
  for (const row of result.rows) {
    const queue = row.queue as QueueName
    if (row.status === 'pending') {
      stats[queue].pending = parseInt(row.count)
    } else if (row.status === 'running' || row.status === 'queued') {
      stats[queue].running = parseInt(row.count)
    }
  }
  
  return stats
}

/**
 * Get tasks by status
 */
export async function getTasksByStatus(
  status: TaskStatus,
  limit = 50
): Promise<QueuedTask[]> {
  const pool = getPool()
  
  const result = await pool.query(
    `SELECT * FROM queued_tasks 
     WHERE status = $1 
     ORDER BY created_at DESC 
     LIMIT $2`,
    [status, limit]
  )
  
  return result.rows.map(mapRowToTask)
}

/**
 * Get tasks for a specific queue
 */
export async function getQueueTasks(
  queueName: QueueName,
  status?: TaskStatus,
  limit = 50
): Promise<QueuedTask[]> {
  const pool = getPool()
  
  let query = `SELECT * FROM queued_tasks WHERE queue = $1`
  const params: any[] = [queueName]
  
  if (status) {
    query += ` AND status = $2`
    params.push(status)
  }
  
  query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`
  params.push(limit)
  
  const result = await pool.query(query, params)
  return result.rows.map(mapRowToTask)
}

/**
 * Cancel a pending task
 */
export async function cancelTask(taskId: string): Promise<boolean> {
  const pool = getPool()
  
  const result = await pool.query(
    `UPDATE queued_tasks SET status = 'cancelled' WHERE id = $1 AND status = 'pending'`,
    [taskId]
  )
  
  return (result.rowCount || 0) > 0
}

/**
 * Clear old completed/failed tasks
 */
export async function cleanupOldTasks(daysOld = 30): Promise<number> {
  const pool = getPool()
  
  const result = await pool.query(
    `DELETE FROM queued_tasks 
     WHERE status IN ('completed', 'failed', 'cancelled') 
     AND completed_at < NOW() - INTERVAL '1 day' * $1`,
    [daysOld]
  )
  
  return result.rowCount || 0
}

// Helper to map DB row to QueuedTask
function mapRowToTask(row: any): QueuedTask {
  return {
    id: row.id,
    queue: row.queue as QueueName,
    agentType: row.agent_type,
    taskName: row.task_name,
    description: row.description,
    priority: row.priority as TaskPriority,
    status: row.status as TaskStatus,
    metadata: row.metadata,
    createdAt: new Date(row.created_at),
    scheduledFor: row.scheduled_for ? new Date(row.scheduled_for) : undefined,
    startedAt: row.started_at ? new Date(row.started_at) : undefined,
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    retries: row.retries,
    maxRetries: row.max_retries,
    error: row.error
  }
}
export * from './types'
