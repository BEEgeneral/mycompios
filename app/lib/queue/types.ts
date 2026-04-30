/**
 * Task Queue System - MyCompi
 * 
 * Based on Polsia's Celery queue but implemented with Next.js API routes.
 * Tasks are stored in PostgreSQL and processed via API calls.
 * Scheduling is handled by GitHub Actions or internal cron.
 * 
 * Queue Architecture:
 * - scheduler: Daily cycle orchestration (morning/evening)
 * - agents: Agent execution tasks
 * - maintenance: System cleanup tasks
 */

import { Task, AgentResult } from '../agents/base'

// Queue types
export type QueueName = 'scheduler' | 'agents' | 'maintenance'

// Task priority
export type TaskPriority = 'low' | 'medium' | 'high'

// Task status
export type TaskStatus = 'pending' | 'queued' | 'running' | 'completed' | 'failed'

// Queued task interface
export interface QueuedTask {
  id: string
  queue: QueueName
  agentType: string
  taskName: string
  description?: string
  priority: TaskPriority
  status: TaskStatus
  metadata?: Record<string, any>
  createdAt: Date
  scheduledFor?: Date
  startedAt?: Date
  completedAt?: Date
  result?: AgentResult
  error?: string
  retries: number
  maxRetries: number
}

// Task creation options
export interface CreateTaskOptions {
  queue?: QueueName
  agentType: string
  taskName: string
  description?: string
  priority?: TaskPriority
  metadata?: Record<string, any>
  scheduledFor?: Date
}

// Queue statistics
export interface QueueStats {
  scheduler: { pending: number; running: number }
  agents: { pending: number; running: number }
  maintenance: { pending: number; running: number }
}

// Task routes (queue → agent mapping)
export const QUEUE_AGENT_MAP: Record<QueueName, string[]> = {
  scheduler: ['orchestrator', 'finance'],
  agents: ['paco', 'research', 'sales', 'finance', 'code', 'social', 'support'],
  maintenance: ['paco']
}

// Default retry policy
export const DEFAULT_MAX_RETRIES = 3
export const DEFAULT_RETRY_DELAY = 60000 // 1 minute
