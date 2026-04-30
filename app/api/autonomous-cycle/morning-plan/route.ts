import { NextResponse } from 'next/server'
import { isMockMode, getMockStubResponse } from '@/app/api/mock-mode/route'

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

    // Get pending tasks
    const pendingTasks = await pool.query(
      `SELECT id, task_name, description, priority, agent_id, created_at
       FROM mission_tasks
       WHERE company_id = $1 AND status IN ('pending', 'approved')
       ORDER BY priority DESC, created_at ASC
       LIMIT 10`,
      [companyId]
    )

    // Get recent memory entries (context)
    const memoryResult = await pool.query(
      `SELECT content, entry_type, created_at FROM memory_entries
       WHERE company_id = $1
       ORDER BY created_at DESC LIMIT 20`,
      [companyId]
    )

    // Get recent activity
    const recentActivity = await pool.query(
      `SELECT action_type, metadata, created_at FROM activity_log
       WHERE company_id = $1
       ORDER BY created_at DESC LIMIT 10`,
      [companyId]
    )

    await pool.end()

    // Build context for LLM
    const context = {
      company: {
        name: company.name,
        mission_statement: company.mission_statement,
        vision: company.vision,
        target_market: company.target_market,
        value_prop: company.value_prop,
        goals: company.goals,
        kpis: company.kpis,
      },
      pending_tasks: pendingTasks.rows,
      recent_memory: memoryResult.rows,
      recent_activity: recentActivity.rows,
      generated_at: new Date().toISOString(),
    }

    let planText = ''
    let tokensUsed = 0
    let costUsd = 0

    if (mockMode) {
      // MOCK MODE: Return stub plan
      planText = `📋 **Morning Plan - ${company.name}**\n\n_mock mode: stub response_\n\n**Prioridades del día:**\n1. Revisar tareas pendientes (${pendingTasks.rows.length})\n2. Analizar estado actual del proyecto\n3. Preparar propuestas para el cliente\n\n**Tareas recomendadas:**\n${pendingTasks.rows.slice(0, 3).map((t: any, i: number) => `${i + 1}. ${t.task_name}`).join('\n')}\n\n**Siguiente paso:** Comenzar con la tarea de mayor prioridad.`
      tokensUsed = 80
      costUsd = 0.0008
    } else {
      // REAL MODE: Generate plan via LLM
      const systemPrompt = `Eres Paco, director de operaciones de MyCompi. Genera un plan del día estructurado y actionable para la empresa. Usa el contexto proporcionado y devuelve SOLO el plan en formato Markdown.`
      const userPrompt = `Contexto de la empresa:\n${JSON.stringify(context, null, 2)}\n\nGenera un plan del día basado en las tareas pendientes, la memoria y la actividad reciente.`

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
            max_tokens: 500
          })
        })

        const data = await res.json()
        planText = data?.choices?.[0]?.message?.content || 'Plan no disponible'
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
              JSON.stringify({ action: 'morning_plan', context }),
              JSON.stringify({ plan: planText }),
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
        planText = `Error generating plan: ${llmErr.message}`
      }
    }

    // Log activity
    const logPool = getDbPool()
    try {
      await logActivity(logPool, companyId, 'morning_plan_generated', {
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
      plan: planText,
      context: {
        pending_tasks_count: pendingTasks.rows.length,
        memory_entries_count: memoryResult.rows.length,
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