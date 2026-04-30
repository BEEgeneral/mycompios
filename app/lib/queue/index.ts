/**
 * Task Queue System - MyCompi
 * 
 * Exports all queue components based on Polsia's Celery architecture:
 * - task-queue.ts: Queue management with PostgreSQL persistence
 * - scheduler.ts: Beat schedule for periodic tasks
 * - worker.ts: Task processor
 * - types.ts: TypeScript interfaces
 * 
 * Usage:
 * 
 * // Create a task
 * import { createQueuedTask } from './queue'
 * await createQueuedTask({
 *   queue: 'agents',
 *   agentType: 'research',
 *   taskName: 'Research competitor X',
 *   priority: 'high'
 * })
 * 
 * // Run the scheduler (in cron/GitHub Actions)
 * import { dispatchDueTasks } from './queue'
 * const due = await dispatchDueTasks()
 * 
 * // Process tasks (in background worker)
 * import { startWorkers } from './queue'
 * await startWorkers()
 */

export * from './types'
export * from './task-queue'
export * from './scheduler'
export * from './worker'
