// Standalone autonomous loop - called by external scheduler (Inngest, cron, etc.)
import { NextResponse } from 'next/server'

const LLM_KEY = process.env.LLM_API_KEY || 'sk-cp-kewjUeaiHUlb-tvKgHb4JIOJt2-GrY6Uj9Y-hPFvOq3QyBsGAlbSQIw-eT7XERlLNrQ2l1-sy42pHSfGloIP46fp52OaX76Z8s6T5MkXMi0CObEeaa5JxFI'
const LLM_URL = 'https://api.minimax.io/v1/text/chatcompletion_v2'
const LLM_MODEL = 'MiniMax-M2.7'

const AGENT_PROMPTS: Record<string, string> = {
  paco: 'Eres Paco, director de operaciones. Ejecuta la tarea. Responde solo con el resultado en 1 frase.',
  lucia: 'Eres Lucía, agente de ventas. Ejecuta la tarea. Responde solo con el resultado en 1 frase.',
  carlos: 'Eres Carlos, agente financiero. Ejecuta la tarea. Responde solo con el resultado en 1 frase.',
  daniel: 'Eres Daniel, analista. Ejecuta la tarea. Responde solo con el resultado en 1 frase.',
  pelayo: 'Eres Pelayo, estratega. Ejecuta la tarea. Responde solo con el resultado en 1 frase.',
  marcos: 'Eres Marcos, soporte. Ejecuta la tarea. Responde solo con el resultado en 1 frase.',
}

export async function POST() {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  
  try {
    const { Pool } = require('pg')
    const pool = new Pool({
      host: process.env.NEON_HOST,
      database: process.env.NEON_DB,
      user: process.env.NEON_USER,
      password: process.env.NEON_PASSWORD,
      ssl: true,
      max: 1,
    })

    // Get companies
    const companies = await pool.query(`
      SELECT c.id, c.name FROM companies c
      JOIN missions m ON m.company_id = c.id
      WHERE m.status = 'active' LIMIT 10
    `)

    const executed = []

    for (const company of companies.rows) {
      // Get pending tasks (max 2 at a time to avoid saturation)
      const tasks = await pool.query(`
        SELECT id, task_name, agent_id FROM mission_tasks
        WHERE company_id = $1 AND status = 'pending'
        ORDER BY priority DESC LIMIT 2
      `, [company.id])

      for (const task of tasks.rows) {
        // Mark running
        await pool.query(
          `UPDATE mission_tasks SET status='running', executed_at=NOW() WHERE id=$1`,
          [task.id]
        )

        // Execute with LLM
        const res = await fetch(LLM_URL, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${LLM_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: LLM_MODEL,
            messages: [
              { role: 'system', content: AGENT_PROMPTS[task.agent_id] || AGENT_PROMPTS.paco },
              { role: 'user', content: `Tarea: ${task.task_name}` }
            ],
            max_tokens: 100
          })
        })

        const data = await res.json()
        const result = data?.choices?.[0]?.message?.content || 'Completado'

        // Mark completed
        await pool.query(
          `UPDATE mission_tasks SET status='completed', completed_at=NOW(), result=$2 WHERE id=$1`,
          [task.id, result]
        )

        executed.push({ task: task.task_name, agent: task.agent_id, result })
      }
    }

    await pool.end()

    return NextResponse.json({
      success: true,
      executed: executed.length,
      results: executed
    }, { status: 200, headers })

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers })
  }
}
