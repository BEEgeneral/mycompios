import { NextResponse } from 'next/server'
import { isMockMode } from '@/app/api/mock-mode/route'

const LLM_KEY = process.env.LLM_API_KEY || 'sk-cp-kewjUeaiHUlb-tvKgHb4JIOJt2-GrY6Uj9Y-hPFvOq3QyBsGAlbSQIw-eT7XERlLNrQ2l1-sy42pHSfGloIP46fp52OaX76Z8s6T5MkXMi0CObEeaa5JxFI'
const LLM_URL = 'https://api.minimax.io/v1/text/chatcompletion_v2'
const LLM_MODEL = 'MiniMax-M2.7'

function getDbPool() {
  const { Pool } = require('pg')
  return new Pool({
    host: process.env.NEON_HOST,
    database: process.env.NEON_DB,
    user: process.env.NEON_USER,
    password: process.env.NEON_PASSWORD,
    ssl: true,
    max: 1,
  })
}

async function logActivity(pool: any, companyId: string, actionType: string, metadata: Record<string, any>) {
  try {
    await pool.query(
      `INSERT INTO activity_log (id, company_id, action_type, metadata, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [require('crypto').randomUUID(), companyId, actionType, JSON.stringify(metadata)]
    )
  } catch (e) {
    console.error('Error logging activity:', e)
  }
}

export async function GET(req: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  const mockMode = isMockMode()

  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('company_id')

    if (!companyId) {
      return NextResponse.json({ error: 'company_id required' }, { status: 400, headers })
    }

    const pool = getDbPool()

    // Get company info
    const companyResult = await pool.query(
      `SELECT id, name, mission_statement, vision, target_market, value_prop, goals, kpis
       FROM companies WHERE id = $1`,
      [companyId]
    )

    if (!companyResult.rows.length) {
      await pool.end()
      return NextResponse.json({ error: 'Company not found' }, { status: 404, headers })
    }

    const company = companyResult.rows[0]

    // Get today's completed tasks
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const completedTasks = await pool.query(
      `SELECT id, task_name, result, completed_at, agent_id
       FROM mission_tasks
       WHERE company_id = $1 AND status = 'completed' AND completed_at >= $2
       ORDER BY completed_at DESC`,
      [companyId, today.toISOString()]
    )

    // Get today's activity
    const todayActivity = await pool.query(
      `SELECT action_type, metadata, created_at FROM activity_log
       WHERE company_id = $1 AND created_at >= $2
       ORDER BY created_at DESC`,
      [companyId, today.toISOString()]
    )

    // Get today's execution logs
    const execLogs = await pool.query(
      `SELECT task_id, tokens_used, cost_usd, duration_secs, completed_at
       FROM execution_logs
       WHERE company_id = $1 AND completed_at >= $2`,
      [companyId, today.toISOString()]
    )

    // Get pending tasks for tomorrow
    const pendingTasks = await pool.query(
      `SELECT id, task_name, priority, agent_id, description
       FROM mission_tasks
       WHERE company_id = $1 AND status IN ('pending', 'approved')
       ORDER BY priority DESC
       LIMIT 5`,
      [companyId]
    )

    // Get recent memory entries
    const memoryResult = await pool.query(
      `SELECT content, entry_type, created_at FROM memory_entries
       WHERE company_id = $1
       ORDER BY created_at DESC LIMIT 10`,
      [companyId]
    )

    await pool.end()

    // Calculate today's stats
    const totalTokens = execLogs.rows.reduce((sum: number, log: any) => sum + (log.tokens_used || 0), 0)
    const totalCost = execLogs.rows.reduce((sum: number, log: any) => sum + (log.cost_usd || 0), 0)
    const totalDuration = execLogs.rows.reduce((sum: number, log: any) => sum + (log.duration_secs || 0), 0)

    const context = {
      company: {
        name: company.name,
        mission_statement: company.mission_statement,
        vision: company.vision,
        goals: company.goals,
        kpis: company.kpis,
      },
      completed_today: completedTasks.rows,
      activity_today: todayActivity.rows,
      execution_stats: {
        tasks_executed: execLogs.rows.length,
        total_tokens: totalTokens,
        total_cost_usd: totalCost,
        total_duration_secs: totalDuration,
      },
      pending_for_tomorrow: pendingTasks.rows,
      recent_memory: memoryResult.rows,
      summary_date: new Date().toISOString(),
    }

    let summaryText = ''
    let tokensUsed = 0
    let costUsd = 0

    if (mockMode) {
      // MOCK MODE: Return stub summary
      summaryText = `🌙 **Evening Summary - ${company.name}**\n\n_mock mode: stub response_\n\n**Completed Today:**\n${completedTasks.rows.length} tareas completadas\n\n**Execution Stats:**\n- Tasks: ${execLogs.rows.length}\n- Tokens: ${totalTokens}\n- Cost: $${totalCost.toFixed(4)}\n- Duration: ${totalDuration.toFixed(1)}s\n\n**Next Steps:**\n${pendingTasks.rows.slice(0, 3).map((t: any, i: number) => `${i + 1}. ${t.task_name}`).join('\n')}\n\n**Summary:** Buen día de trabajo. ${completedTasks.rows.length} tareas completadas con éxito.`
      tokensUsed = 90
      costUsd = 0.0009
    } else {
      // REAL MODE: Generate summary via LLM
      const systemPrompt = `Eres Paco, director de operaciones de MyCompi. Genera un resumen ejecutivo del día para la empresa. Usa el contexto proporcionado y devuelve SOLO el resumen en formato Markdown con:\n- Qué se completó\n- Stats de ejecución\n- Siguientes pasos\n- Un mensaje motivacional breve`
      const userPrompt = `Contexto del día:\n${JSON.stringify(context, null, 2)}\n\nGenera el evening summary.`

      try {
        const startTime = Date.now()
        const res = await fetch(LLM_URL, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${LLM_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: LLM_MODEL,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            max_tokens: 600
          })
        })

        const data = await res.json()
        summaryText = data?.choices?.[0]?.message?.content || 'Summary not available'
        tokensUsed = data?.usage?.total_tokens || 0
        costUsd = (tokensUsed / 1_000_000) * 0.5
        const durationSecs = (Date.now() - startTime) / 1000

        // Log execution
        const pool2 = getDbPool()
        try {
          await pool2.query(
            `INSERT INTO execution_logs
              (id, company_id, task_id, agent_id, input_context, output, tokens_used, cost_usd, duration_secs, llm_model, started_at, completed_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW() - interval '${Math.round(durationSecs)} seconds', NOW())`,
            [
              require('crypto').randomUUID(),
              companyId,
              null,
              'paco',
              JSON.stringify({ action: 'evening_summary', context }),
              JSON.stringify({ summary: summaryText }),
              tokensUsed,
              costUsd,
              durationSecs,
              LLM_MODEL,
            ]
          )
        } finally {
          await pool2.end()
        }
      } catch (llmErr: any) {
        summaryText = `Error generating summary: ${llmErr.message}`
      }
    }

    // Log activity
    const logPool = getDbPool()
    try {
      await logActivity(logPool, companyId, 'evening_summary_sent', {
        completed_tasks: completedTasks.rows.length,
        execution_stats: {
          tasks_executed: execLogs.rows.length,
          total_tokens: totalTokens,
          total_cost_usd: totalCost,
          total_duration_secs: totalDuration,
        },
        pending_tasks: pendingTasks.rows.length,
        tokens_used: tokensUsed,
        cost_usd: costUsd,
        mock_mode: mockMode,
      })
    } finally {
      await logPool.end()
    }

    return NextResponse.json({
      success: true,
      company_id: companyId,
      company_name: company.name,
      summary: summaryText,
      stats: {
        completed_today: completedTasks.rows.length,
        tasks_executed: execLogs.rows.length,
        total_tokens: totalTokens,
        total_cost_usd: totalCost,
        total_duration_secs: totalDuration,
        pending_tasks: pendingTasks.rows.length,
      },
      mock_mode: mockMode,
      tokens_used: tokensUsed,
      cost_usd: costUsd,
    }, { status: 200, headers })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}