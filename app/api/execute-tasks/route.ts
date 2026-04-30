// Execute Tasks - Runs agent tasks with full tracking (Polsia-style)
// Each execution creates an agent_run record with tokens, cost, duration

import { NextResponse } from 'next/server'
import { runAgentForTask, AGENT_MAP, VALID_AGENT_TYPES } from '@/lib/agents'
import { isMockMode } from '@/lib/agents/base'

const LLM_KEY = process.env.LLM_API_KEY || 'sk-cp-kewjUeaiHUlb-tvKgHb4JIOJt2-GrY6Uj9Y-hPFvOq3QyBsGAlbSQIw-eT7XERlLNrQ2l1-sy42pHSfGloIP46fp52OaX76Z8s6T5MkXMi0CObEeaa5JxFI'
const LLM_URL = 'https://api.minimax.io/v1/text/chatcompletion_v2'
const LLM_MODEL = 'MiniMax-M2.7'

// Cost per 1M tokens (approximate for MiniMax)
const COST_PER_TOKEN = 0.00001 // ~$0.01 per 1K tokens

interface AgentRunRecord {
  id: string
  task_id: string
  agent_type: string
  input_context: Record<string, any>
  output: Record<string, any>
  tokens_used: number
  cost_usd: number
  duration_secs: number
  status: 'running' | 'completed' | 'failed'
  started_at: Date
  ended_at?: Date
}

async function createAgentRun(pool: any, taskId: string, agentType: string, inputContext: any): Promise<string> {
  const runId = require('crypto').randomUUID()
  await pool.query(
    `INSERT INTO agent_runs (id, task_id, agent_type, input_context, status, started_at)
     VALUES ($1, $2, $3, $4, 'running', NOW())`,
    [runId, taskId, agentType, JSON.stringify(inputContext)]
  )
  return runId
}

async function finishAgentRun(
  pool: any, 
  runId: string, 
  status: string, 
  output: any, 
  tokensUsed: number,
  costUsd: number,
  durationSecs: number
) {
  await pool.query(
    `UPDATE agent_runs 
     SET status=$1, output=$2, tokens_used=$3, cost_usd=$4, duration_secs=$5, ended_at=NOW()
     WHERE id=$6`,
    [status, JSON.stringify(output), tokensUsed, costUsd, durationSecs, runId]
  )
}

async function logActivity(
  pool: any, 
  companyId: string, 
  agentType: string, 
  action: string, 
  summary: string, 
  level: string = 'info'
) {
  try {
    await pool.query(
      `INSERT INTO activity_log (id, company_id, agent_type, action, summary, level, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [require('crypto').randomUUID(), companyId, agentType, action, summary, level]
    )
  } catch (e) {
    console.error('Activity log error:', e)
  }
}

async function saveToMemory(
  pool: any, 
  companyId: string, 
  taskId: string, 
  taskName: string, 
  result: string,
  agentType: string
) {
  try {
    const entryType = result.includes('research') || taskName.toLowerCase().includes('research') 
      ? 'research' 
      : 'result'
    
    await pool.query(
      `INSERT INTO memory_entries (id, company_id, entry_type, content, tags, source, related_task_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        require('crypto').randomUUID(),
        companyId,
        entryType,
        `[${agentType}] ${taskName}: ${result}`,
        [agentType],
        'task_execution',
        taskId
      ]
    )
  } catch (e) {
    console.error('Memory save error:', e)
  }
}

async function getFullContext(pool: any, companyId: string): Promise<any> {
  // Get company info
  const company = await pool.query(
    `SELECT id, name, mission_statement, current_phase, autonomy_mode, credits_total, credits_used
     FROM companies WHERE id=$1`,
    [companyId]
  )
  
  if (!company.rows.length) return null
  
  const c = company.rows[0]
  
  // Get memory entries
  const memory = await pool.query(
    `SELECT id, entry_type, content, tags, source, created_at
     FROM memory_entries WHERE company_id=$1 ORDER BY created_at DESC LIMIT 20`,
    [companyId]
  )
  
  // Get pending tasks
  const tasks = await pool.query(
    `SELECT id, task_name, agent_id, status, priority FROM mission_tasks 
     WHERE company_id=$1 ORDER BY priority DESC LIMIT 10`,
    [companyId]
  )
  
  // Get proposals
  const proposals = await pool.query(
    `SELECT id, task_name, status FROM proposals WHERE company_id=$1`,
    [companyId]
  )
  
  return {
    company_id: c.id,
    company_name: c.name,
    mission_statement: c.mission_statement || '',
    current_phase: c.current_phase || 0,
    autonomy_mode: c.autonomy_mode || 'manual',
    memory: memory.rows,
    tasks: tasks.rows,
    proposals: proposals.rows
  }
}

// Estimate tokens from LLM response (rough estimate based on response length)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4) // ~4 chars per token average
}

export async function POST() {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  
  // Mock mode check
  if (isMockMode()) {
    return NextResponse.json({
      success: true,
      mode: 'mock',
      executed: 0,
      results: [{ mock: true, message: 'MOCK_MODE enabled - no real execution' }]
    }, { headers })
  }
  
  try {
    const { Pool } = require('pg')
    const pool = new Pool({
      host: process.env.NEON_HOST,
      port: 5432,
      database: process.env.NEON_DB,
      user: process.env.NEON_USER,
      password: process.env.NEON_PASSWORD,
      ssl: true,
      max: 1,
    })

    // Get companies with active missions
    const companies = await pool.query(`
      SELECT DISTINCT c.id, c.name 
      FROM companies c
      JOIN missions m ON m.company_id = c.id
      WHERE m.status = 'active' 
      LIMIT 5
    `)

    const allResults = []

    for (const company of companies.rows) {
      // Get pending tasks (max 2 per company)
      const tasks = await pool.query(`
        SELECT id, task_name, agent_id, priority 
        FROM mission_tasks 
        WHERE company_id=$1 AND status='pending'
        ORDER BY priority DESC LIMIT 2
      `, [company.id])

      if (!tasks.rows.length) continue

      // Get full context for this company
      const context = await getFullContext(pool, company.id)
      if (!context) continue

      for (const task of tasks.rows) {
        // Validate agent type
        const agentType = VALID_AGENT_TYPES.includes(task.agent_id) ? task.agent_id : 'paco'
        
        // Mark task as running
        await pool.query(
          `UPDATE mission_tasks SET status='running', executed_at=NOW() WHERE id=$1`,
          [task.id]
        )

        // Create agent run record
        const runId = await createAgentRun(pool, task.id, agentType, context)
        const startTime = Date.now()

        try {
          // Execute via agent system (Polsia-style)
          const result = await runAgentForTask(agentType, task, context)
          
          const duration = (Date.now() - startTime) / 1000
          const tokensUsed = estimateTokens(result.summary)
          const costUsd = tokensUsed * COST_PER_TOKEN

          if (result.success) {
            // Mark task completed
            await pool.query(
              `UPDATE mission_tasks SET status='completed', completed_at=NOW(), result=$2 WHERE id=$1`,
              [task.id, result.summary]
            )
            
            // Save to memory
            await saveToMemory(pool, company.id, task.id, task.task_name, result.summary, agentType)
            
            // Log activity
            await logActivity(pool, company.id, agentType, 'task_completed', result.summary, 'success')
          } else {
            // Mark task failed
            await pool.query(
              `UPDATE mission_tasks SET status='failed', result=$2 WHERE id=$1`,
              [task.id, result.error || 'Unknown error']
            )
            
            await logActivity(pool, company.id, agentType, 'task_failed', result.error || 'Failed', 'error')
          }

          // Finish agent run record
          await finishAgentRun(
            pool, runId, 
            result.success ? 'completed' : 'failed',
            { summary: result.summary, details: result.details },
            tokensUsed, costUsd, duration
          )

          allResults.push({
            task: task.task_name,
            agent: agentType,
            result: result.summary,
            success: result.success,
            tokens_used: tokensUsed,
            cost_usd: costUsd,
            duration_secs: duration
          })

        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error)
          
          // Mark task failed
          await pool.query(
            `UPDATE mission_tasks SET status='failed', result=$2 WHERE id=$1`,
            [task.id, errorMsg]
          )
          
          // Finish run with error
          await finishAgentRun(pool, runId, 'failed', { error: errorMsg }, 0, 0, (Date.now() - startTime) / 1000)
          
          await logActivity(pool, company.id, agentType, 'task_failed', errorMsg, 'error')
          
          allResults.push({
            task: task.task_name,
            agent: agentType,
            error: errorMsg,
            success: false
          })
        }
      }
    }

    await pool.end()

    return NextResponse.json({
      success: true,
      executed: allResults.length,
      results: allResults
    }, { status: 200, headers })

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers })
  }
}