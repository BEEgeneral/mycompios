// CHAT - Chat with agents with real task context
import { NextResponse } from 'next/server'

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

const LLM_CONFIG = {
  minimax: { url: 'https://api.minimax.io/v1/text/chatcompletion_v2', model: 'MiniMax-M2.7' }
}

const LLM_KEY = process.env.LLM_API_KEY || ''

const AGENTS = {
  paco: {
    name: 'Paco',
    role: 'Director de operaciones',
    emoji: '🎯'
  },
  lucia: {
    name: 'Lucía',
    role: 'Agente de ventas',
    emoji: '💼'
  },
  carlos: {
    name: 'Carlos',
    role: 'Agente financiero',
    emoji: '💰'
  }
}

async function callLLM(messages) {
  const res = await fetch(LLM_CONFIG.minimax.url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${LLM_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: LLM_CONFIG.minimax.model,
      messages,
      max_tokens: 800
    })
  })
  if (!res.ok) throw new Error(`LLM error: ${res.status}`)
  const data = await res.json()
  return data?.choices?.[0]?.message?.content || ''
}

function buildSystemPrompt(agentId: string, tasks: any[], companyName: string) {
  const agent = AGENTS[agentId] || AGENTS.paco

  let taskContext = ''
  if (tasks.length > 0) {
    const taskList = tasks.map(t => `- [${t.status}] ${t.task_name} (prioridad: ${t.priority})`).join('\n')
    taskContext = `\n\nTAREAS DE TU MISIÓN:\n${taskList}`
  } else {
    taskContext = '\n\nNo tienes tareas asignadas pendientes.'
  }

  return `Eres ${agent.name}, ${agent.role} de MyCompi para ${companyName}.
Tu trabajo es coordinar el equipo, supervisar tareas y dar resultados concretos.
Cuando el usuario te pida algo que esté en tus tareas,.confirmalo y márcalo como completado.

COMPORTAMIENTO:
- Sé directo y conciso
- Si completas algo en el chat, di "TAREA:[id] COMPLETADA" para actualizarla
- Reporta progreso de las tareas activo
- Si el usuario pregunta por algo fuera de tu rol, redirige al agente correcto${taskContext}

TUS HERRAMIENTAS:
- Puedes marcar tareas como completadas diciendo "TAREA:[id] COMPLETADA"
- Si detectas un problema, créalo como nueva tarea con "NUEVA TAREA:[nombre]"`
}

export async function POST(req) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  }

  if (req.method === 'OPTIONS') {
    return new NextResponse('', { status: 200, headers })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 401, headers })
    }

    const { agent_id, message } = await req.json()
    const selectedAgent = agent_id || 'paco'

    const pool = getDbPool()

    // Get user + company
    // Note: sessions.id IS the token - no token column exists
    const sessionResult = await pool.query(
      'SELECT user_id FROM sessions WHERE id = $1 AND expires_at > NOW()',
      [token]
    )

    if (sessionResult.rows.length === 0) {
      await pool.end()
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401, headers })
    }

    const userResult = await pool.query(
      'SELECT company_id FROM app_user WHERE id = $1',
      [sessionResult.rows[0].user_id]
    )

    if (userResult.rows.length === 0) {
      await pool.end()
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404, headers })
    }

    const companyId = userResult.rows[0].company_id

    // Get company name
    const companyResult = await pool.query(
      'SELECT name FROM companies WHERE id = $1',
      [companyId]
    )
    const companyName = companyResult.rows[0]?.name || 'tu empresa'

    // Get active mission tasks for this agent
    const tasksResult = await pool.query(`
      SELECT mt.id, mt.task_name, mt.agent_id, mt.area, mt.priority, mt.status, mt.created_at
      FROM mission_tasks mt
      JOIN missions m ON m.id = mt.mission_id
      WHERE mt.company_id = $1 AND mt.agent_id = $2 AND mt.status != 'completed'
      ORDER BY mt.priority DESC
      LIMIT 5
    `, [companyId, selectedAgent])

    const tasks = tasksResult.rows

    // Build system prompt with real context
    const systemPrompt = buildSystemPrompt(selectedAgent, tasks, companyName)

    // Call LLM
    const response = await callLLM([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message }
    ])

    // Handle task completion commands in response
    const completionMatches = response.matchAll(/TAREA:([a-f0-9-]+) COMPLETADA/g)
    for (const match of completionMatches) {
      const taskId = match[1]
      await pool.query(
        `UPDATE mission_tasks SET status = 'completed', completed_at = NOW() WHERE id = $1`,
        [taskId]
      )
    }

    // Save to memory
    const chatEntryId = require('crypto').randomUUID()
    await pool.query(
      `INSERT INTO memory_entries (id, company_id, entry_type, content, tags, source)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        chatEntryId,
        companyId,
        'chat',
        `Chat con ${AGENTS[selectedAgent]?.name || 'Paco'}: ${message.substring(0, 100)}`,
        ['chat', selectedAgent],
        'chat'
      ]
    )

    // Also save/update chat session metadata
    const sessionId = require('crypto').randomUUID()
    const sessionTitle = message.substring(0, 40) + (message.length > 40 ? '...' : '')
    await pool.query(
      `INSERT INTO memory_entries (id, company_id, entry_type, content, tags, source)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         content = EXCLUDED.content,
         updated_at = NOW()`,
      [
        sessionId,
        companyId,
        'chat_session',
        JSON.stringify({ sessionId, title: sessionTitle, agentId: selectedAgent }),
        ['chat_session', selectedAgent],
        'chat_session'
      ]
    )

    await pool.end()

    return NextResponse.json({
      success: true,
      agent: AGENTS[selectedAgent]?.name || 'Paco',
      response,
      tasks_active: tasks.length,
      tasks_preview: tasks.slice(0, 3).map(t => ({ id: t.id, name: t.task_name, status: t.status }))
    }, { status: 200, headers })

  } catch (err) {
    console.error('Chat error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers })
  }
}
