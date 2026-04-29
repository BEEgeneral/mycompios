// AUTONOMOUS LOOP - Execute tasks automatically for all companies
import { NextResponse } from 'next/server'

const LLM_KEY = 'sk-cp-kewjUeaiHUlb-tvKgHb4JIOJt2-GrY6Uj9Y-hPFvOq3QyBsGAlbSQIw-eT7XERlLNrQ2l1-sy42pHSfGloIP46fp52OaX76Z8s6T5MkXMi0CObEeaa5JxFI'
const LLM_URL = 'https://api.minimax.io/v1/text/chatcompletion_v2'
const LLM_MODEL = 'MiniMax-M2.7'

const AGENT_PROMPTS = {
  paco: 'Eres Paco, director de operaciones. Ejecuta la tarea de forma concreta y reporta el resultado en una frase.',
  lucia: 'Eres Lucía, agente de ventas. Ejecuta la tarea de forma concreta y reporta el resultado en una frase.',
  carlos: 'Eres Carlos, agente financiero. Ejecuta la tarea de forma concreta y reporta el resultado en una frase.',
  daniel: 'Eres Daniel, analista. Ejecuta la tarea de forma concreta y reporta el resultado en una frase.',
  pelayo: 'Eres Pelayo, estratega. Ejecuta la tarea de forma concreta y reporta el resultado en una frase.',
  marcos: 'Eres Marcos, soporte. Ejecuta la tarea de forma concreta y reporta el resultado en una frase.',
}

async function executeWithLLM(task: string, agentId: string): Promise<string> {
  const prompt = AGENT_PROMPTS[agentId as keyof typeof AGENT_PROMPTS] || AGENT_PROMPTS.paco
  
  const res = await fetch(LLM_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${LLM_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: `Ejecuta esta tarea: ${task}. Reporta solo el resultado concretado.` }
      ],
      max_tokens: 200
    })
  })
  
  if (!res.ok) return `Error ejecutando: ${res.status}`
  const data = await res.json()
  return data?.choices?.[0]?.message?.content || 'Completado'
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
    
    const results = []
    
    // Get all companies with active missions
    const companies = await pool.query(`
      SELECT c.id, c.name, c.metadata
      FROM companies c
      JOIN missions m ON m.company_id = c.id
      WHERE m.status = 'active'
    `)
    
    for (const company of companies.rows) {
      const cid = company.id
      const companyName = company.name
      
      // Get pending tasks for this company (max 3 at a time)
      const tasks = await pool.query(`
        SELECT id, task_name, agent_id, priority
        FROM mission_tasks
        WHERE company_id = $1 AND status = 'pending'
        ORDER BY priority DESC
        LIMIT 3
      `, [cid])
      
      if (tasks.rows.length === 0) continue
      
      const executedTasks = []
      
      for (const task of tasks.rows) {
        // Mark as running
        await pool.query(
          `UPDATE mission_tasks SET status = 'running', executed_at = NOW() WHERE id = $1`,
          [task.id]
        )
        
        // Execute with LLM
        const result = await executeWithLLM(task.task_name, task.agent_id)
        
        // Mark as completed
        await pool.query(
          `UPDATE mission_tasks SET status = 'completed', completed_at = NOW(), result = $2 WHERE id = $1`,
          [task.id, result]
        )
        
        // Log in learning_interactions
        await pool.query(
          `INSERT INTO learning_interactions (company_id, agent_id, user_message, agent_response, created_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [cid, task.agent_id, task.task_name, result]
        )
        
        executedTasks.push({
          task: task.task_name,
          agent: task.agent_id,
          result
        })
      }
      
      results.push({
        company: companyName,
        executed: executedTasks
      })
    }
    
    await pool.end()
    
    return NextResponse.json({
      success: true,
      companies_processed: results.length,
      results
    }, { status: 200, headers })
    
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers })
  }
}
