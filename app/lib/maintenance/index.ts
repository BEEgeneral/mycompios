/**
 * Maintenance Tasks - Polsia-style cleanup
 * 
 * Scheduled maintenance tasks for database cleanup
 */

/**
 * Cleanup old activity log entries (older than 90 days)
 */
export async function cleanupOldActivity(): Promise<{ deleted: number }> {
  const { Pool } = require('pg')
  const pool = new Pool({
    host: process.env.NEON_HOST,
    port: 5432,
    database: process.env.NEON_DB,
    user: process.env.NEON_USER,
    password: process.env.NEON_PASSWORD,
    ssl: true,
  })

  try {
    const result = await pool.query(`
      DELETE FROM activity_log 
      WHERE created_at < NOW() - INTERVAL '90 days'
    `)
    
    const deleted = result.rowCount || 0
    console.log(`[Maintenance] Deleted ${deleted} old activity entries`)
    
    await pool.end()
    return { deleted }
  } catch (error) {
    console.error('[Maintenance] cleanup_old_activity failed:', error)
    await pool.end()
    return { deleted: 0 }
  }
}

/**
 * Cleanup old memory entries (older than 90 days, except facts/decisions)
 */
export async function cleanupOldMemories(): Promise<{ deleted: number }> {
  const { Pool } = require('pg')
  const pool = new Pool({
    host: process.env.NEON_HOST,
    port: 5432,
    database: process.env.NEON_DB,
    user: process.env.NEON_USER,
    password: process.env.NEON_PASSWORD,
    ssl: true,
  })

  try {
    const result = await pool.query(`
      DELETE FROM memory_entries 
      WHERE created_at < NOW() - INTERVAL '90 days'
      AND entry_type NOT IN ('fact', 'decision')
      AND entry_type NOT IN ('goal', 'preference')
    `)
    
    const deleted = result.rowCount || 0
    console.log(`[Maintenance] Deleted ${deleted} old memory entries`)
    
    await pool.end()
    return { deleted }
  } catch (error) {
    console.error('[Maintenance] cleanup_old_memories failed:', error)
    await pool.end()
    return { deleted: 0 }
  }
}

/**
 * Cleanup stale agent_runs (older than 30 days)
 */
export async function cleanupOldAgentRuns(): Promise<{ deleted: number }> {
  const { Pool } = require('pg')
  const pool = new Pool({
    host: process.env.NEON_HOST,
    port: 5432,
    database: process.env.NEON_DB,
    user: process.env.NEON_USER,
    password: process.env.NEON_PASSWORD,
    ssl: true,
  })

  try {
    const result = await pool.query(`
      DELETE FROM agent_runs 
      WHERE created_at < NOW() - INTERVAL '30 days'
      AND status IN ('completed', 'failed')
    `)
    
    const deleted = result.rowCount || 0
    console.log(`[Maintenance] Deleted ${deleted} old agent_runs`)
    
    await pool.end()
    return { deleted }
  } catch (error) {
    console.error('[Maintenance] cleanup_old_agent_runs failed:', error)
    await pool.end()
    return { deleted: 0 }
  }
}

/**
 * Run all maintenance tasks
 */
export async function runMaintenance(): Promise<{
  activity_deleted: number
  memories_deleted: number
  agent_runs_deleted: number
}> {
  console.log('[Maintenance] Starting maintenance tasks...')
  
  const activity = await cleanupOldActivity()
  const memories = await cleanupOldMemories()
  const agentRuns = await cleanupOldAgentRuns()
  
  console.log('[Maintenance] Complete:', {
    activity: activity.deleted,
    memories: memories.deleted,
    agentRuns: agentRuns.deleted
  })
  
  return {
    activity_deleted: activity.deleted,
    memories_deleted: memories.deleted,
    agent_runs_deleted: agentRuns.deleted
  }
}
