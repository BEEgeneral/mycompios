/**
 * Worker - Processes tasks from the queue
 * 
 * Based on Polsia's celery_app/worker.py
 * Fetches tasks from queues and executes them.
 */

import { Pool } from 'pg'
import { AgentResult } from '../agents/base'
import { AGENT_MAP } from '../agents'
import { isMockMode } from '../mock'
import {
  dequeueTask,
  markTaskRunning,
  markTaskCompleted,
  markTaskFailed,
  getQueueStats,
  QueueStats,
  QueuedTask,
  QueueName
} from './task-queue'

// Worker configuration
const WORKER_CONFIG = {
  prefetchMultiplier: 1, // One task per agent at a time
  maxConcurrency: 4, // Process up to 4 tasks simultaneously
  pollInterval: 5000, // 5 seconds between queue polls
}

let isRunning = false
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
 * Process a single task
 */
async function processTask(task: QueuedTask): Promise<AgentResult> {
  const { agentType, taskName, metadata } = task
  
  // Get agent from AGENT_MAP
  const AgentClass = AGENT_MAP[agentType]
  if (!AgentClass) {
    throw new Error(`Unknown agent type: ${agentType}`)
  }
  
  const agent = AgentClass
  
  // Build context for the agent
  const context = await buildContext(task.metadata?.companyId)
  
  // Execute the agent
  const result = await agent.execute(context, {
    id: task.id,
    task_name: taskName,
    agent_id: agentType,
    status: 'pending',
    priority: 1
  })
  
  return result
}

/**
 * Build execution context for an agent
 */
async function buildContext(companyId?: string): Promise<any> {
  const pool = getPool()
  
  // For now, return minimal context
  // In full implementation, this would call get_full_context()
  return {
    company_id: companyId || 'default',
    mission_statement: '',
    current_phase: 0,
    autonomy_mode: 'manual',
    memory: [],
    tasks: [],
    proposals: []
  }
}

/**
 * Process all pending tasks in a queue
 */
async function processQueue(queueName: QueueName): Promise<number> {
  let processed = 0
  
  while (true) {
    // Dequeue next task
    const task = await dequeueTask(queueName)
    if (!task) break
    
    // Mark as running
    await markTaskRunning(task.id)
    
    try {
      // Mock mode check
      if (isMockMode()) {
        // Return mock result
        const mockResult: AgentResult = {
          success: true,
          summary: `[MOCK] Completed: ${task.taskName}`,
          details: { mock: true }
        }
        await markTaskCompleted(task.id, mockResult)
        processed++
        continue
      }
      
      // Execute task
      const result = await processTask(task)
      
      if (result.success) {
        await markTaskCompleted(task.id, result)
      } else {
        await markTaskFailed(task.id, result.error || 'Unknown error')
      }
      
      processed++
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      const shouldRetry = await markTaskFailed(task.id, errorMsg)
      
      if (!shouldRetry) {
        console.error(`Task ${task.id} failed permanently: ${errorMsg}`)
      }
    }
  }
  
  return processed
}

/**
 * Run the worker for a specific queue
 */
export async function runWorker(queueName: QueueName): Promise<void> {
  console.log(`[Worker] Starting worker for queue: ${queueName}`)
  
  while (isRunning) {
    try {
      const processed = await processQueue(queueName)
      if (processed > 0) {
        console.log(`[Worker] Processed ${processed} tasks from ${queueName}`)
      }
      
      // Wait before next poll
      await sleep(WORKER_CONFIG.pollInterval)
      
    } catch (error) {
      console.error(`[Worker] Error processing ${queueName}:`, error)
      await sleep(WORKER_CONFIG.pollInterval * 2) // Wait longer on error
    }
  }
  
  console.log(`[Worker] Stopping worker for queue: ${queueName}`)
}

/**
 * Start all workers
 */
export async function startWorkers(): Promise<void> {
  isRunning = true
  
  // Start workers for each queue in parallel
  const queues: QueueName[] = ['scheduler', 'agents', 'maintenance']
  
  await Promise.all(queues.map(queue => runWorker(queue)))
}

/**
 * Stop all workers
 */
export function stopWorkers(): void {
  isRunning = false
}

/**
 * Get worker statistics
 */
export async function getWorkerStats(): Promise<{
  running: boolean
  queues: QueueStats
  uptime: number
}> {
  return {
    running: isRunning,
    queues: await getQueueStats(),
    uptime: process.uptime()
  }
}

// Utility
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
