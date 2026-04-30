/**
 * Scheduler - Beat schedule for periodic tasks
 * 
 * Based on Polsia's celery_app/beat_schedule.py
 * Implements crontab-like scheduling without Celery.
 * 
 * Schedules:
 * - morning-cycle: 06:00 UTC (scheduler queue)
 * - evening-cycle: 20:00 UTC (scheduler queue)
 * - social-sweep: Every 2 hours (agents queue)
 * - email-sweep: Every 3 hours (agents queue)
 * - ads-sync: Every 6 hours (agents queue)
 */

import { createQueuedTask, getQueueStats } from './task-queue'
import { QueueName } from './types'

// Schedule definitions (like Celery Beat schedule)
export interface BeatScheduleEntry {
  task: string
  schedule: Crontab
  queue: QueueName
  options?: Record<string, any>
}

export interface Crontab {
  minute?: number | '*'
  hour?: number | '*' | number[]
  dayOfMonth?: number | '*'
  month?: number | '*'
  dayOfWeek?: number | '*'
}

// Current time in UTC
function getCurrentTime(): { minute: number; hour: number; dayOfMonth: number; month: number; dayOfWeek: number } {
  const now = new Date()
  return {
    minute: now.getUTCMinutes(),
    hour: now.getUTCHours(),
    dayOfMonth: now.getUTCDate(),
    month: now.getUTCMonth() + 1,
    dayOfWeek: now.getUTCDay()
  }
}

/**
 * Check if current time matches crontab schedule
 */
function matchesCrontab(schedule: Crontab): boolean {
  const now = getCurrentTime()
  
  // Check minute
  if (schedule.minute !== '*' && schedule.minute !== now.minute) {
    return false
  }
  
  // Check hour
  if (schedule.hour !== '*') {
    if (Array.isArray(schedule.hour)) {
      if (!schedule.hour.includes(now.hour)) return false
    } else if (schedule.hour !== now.hour) {
      return false
    }
  }
  
  // Check day of week (0 = Sunday, 1 = Monday, etc.)
  if (schedule.dayOfWeek !== '*' && schedule.dayOfWeek !== now.dayOfWeek) {
    return false
  }
  
  return true
}

/**
 * Beat schedule - defines all periodic tasks
 */
export const BEAT_SCHEDULE: BeatScheduleEntry[] = [
  // Daily Cycles - Scheduler queue
  {
    task: 'scheduler.morning-cycle',
    schedule: { hour: 6, minute: 0 }, // 06:00 UTC
    queue: 'scheduler',
    options: { cycle: 'morning' }
  },
  {
    task: 'scheduler.evening-cycle',
    schedule: { hour: 20, minute: 0 }, // 20:00 UTC
    queue: 'scheduler',
    options: { cycle: 'evening' }
  },
  
  // Sweeps - Agents queue
  {
    task: 'agents.social-sweep',
    schedule: { hour: '*', minute: 0 }, // Every 2 hours (0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22)
    queue: 'agents',
    options: { agentType: 'social', action: 'check_mentions' }
  },
  {
    task: 'agents.email-sweep',
    schedule: { hour: '*', minute: 0 }, // Every 3 hours (0, 3, 6, 9, 12, 15, 18, 21)
    queue: 'agents',
    options: { agentType: 'support', action: 'check_inbox' }
  },
  {
    task: 'agents.ads-sync',
    schedule: { hour: '*', minute: 0 }, // Every 6 hours (0, 6, 12, 18)
    queue: 'agents',
    options: { agentType: 'finance', action: 'sync_stripe' }
  },
  
  // Maintenance - runs daily at midnight
  {
    task: 'maintenance.cleanup',
    schedule: { hour: 0, minute: 0 }, // 00:00 UTC daily
    queue: 'maintenance',
    options: { action: 'cleanup' }
  }
]

/**
 * Check which scheduled tasks should run now
 */
export function getDueTasks(): BeatScheduleEntry[] {
  return BEAT_SCHEDULE.filter(entry => matchesCrontab(entry.schedule))
}

/**
 * Dispatch due tasks to the queue
 */
export async function dispatchDueTasks(): Promise<string[]> {
  const dueTasks = getDueTasks()
  const dispatched: string[] = []
  
  for (const entry of dueTasks) {
    const taskName = getTaskDisplayName(entry.task)
    
    await createQueuedTask({
      queue: entry.queue,
      agentType: entry.options?.agentType || extractAgentType(entry.task),
      taskName,
      description: `Scheduled: ${entry.task}`,
      priority: entry.queue === 'scheduler' ? 'high' : 'medium',
      metadata: {
        scheduledTask: entry.task,
        cycle: entry.options?.cycle,
        action: entry.options?.action
      }
    })
    
    dispatched.push(entry.task)
  }
  
  return dispatched
}

/**
 * Get task display name for human readability
 */
function getTaskDisplayName(task: string): string {
  const names: Record<string, string> = {
    'scheduler.morning-cycle': 'Morning planning cycle',
    'scheduler.evening-cycle': 'Evening summary cycle',
    'agents.social-sweep': 'Social media sweep',
    'agents.email-sweep': 'Email inbox sweep',
    'agents.ads-sync': 'Ads & Stripe sync',
    'maintenance.cleanup': 'System cleanup'
  }
  return names[task] || task
}

/**
 * Extract agent type from task name
 */
function extractAgentType(task: string): string {
  if (task.startsWith('scheduler.')) return 'orchestrator'
  if (task.startsWith('agents.')) {
    const agentMap: Record<string, string> = {
      'social-sweep': 'social',
      'email-sweep': 'support',
      'ads-sync': 'finance'
    }
    const agent = task.replace('agents.', '')
    return agentMap[agent] || 'paco'
  }
  return 'paco'
}

/**
 * Get next run times for all scheduled tasks
 */
export function getNextRunTimes(): Record<string, Date | null> {
  const nextRuns: Record<string, Date | null> = {}
  const now = new Date()
  
  for (const entry of BEAT_SCHEDULE) {
    const nextRun = getNextRunTime(entry.schedule, now)
    nextRuns[entry.task] = nextRun
  }
  
  return nextRuns
}

/**
 * Calculate next run time for a crontab schedule
 */
function getNextRunTime(schedule: Crontab, from: Date): Date | null {
  const now = new Date(from)
  
  // Simple implementation: find next matching minute/hour
  for (let minute = now.getUTCMinutes() + 1; minute < 60; minute++) {
    const testMinute = schedule.minute === '*' || schedule.minute === minute
    if (!testMinute) continue
    
    for (let hour = now.getUTCHours(); hour < 24; hour++) {
      let matchHour = schedule.hour === '*'
      if (Array.isArray(schedule.hour)) {
        matchHour = schedule.hour.includes(hour)
      } else if (schedule.hour !== '*') {
        matchHour = schedule.hour === hour
      }
      if (!matchHour) continue
      
      const next = new Date(now)
      next.setUTCHours(hour, minute, 0, 0)
      return next
    }
  }
  
  return null // Will run tomorrow
}

/**
 * Format schedule as readable string
 */
export function formatSchedule(entry: BeatScheduleEntry): string {
  const { schedule } = entry
  
  if (schedule.hour === '*') {
    const interval = getHourInterval(schedule.hour as any)
    return `Every ${interval} hour(s) at minute ${schedule.minute || 0}`
  }
  
  if (typeof schedule.hour === 'number' && typeof schedule.minute === 'number') {
    return `Daily at ${String(schedule.hour).padStart(2, '0')}:${String(schedule.minute).padStart(2, '0')} UTC`
  }
  
  return JSON.stringify(schedule)
}

function getHourInterval(hour: string): number {
  if (Array.isArray(hour)) return hour.length > 0 ? 24 / hour.length : 24
  return 24
}
