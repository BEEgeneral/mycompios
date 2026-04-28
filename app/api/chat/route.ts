// CHAT - Chat with agents (Paco, Lucía, Carlos)
import { NextResponse } from 'next/server'

function getDbPool() {
  const { Pool } = require('pg')
  return new Pool({
    host: process.env.NEON_HOST,
    port: 5432,
    database: process.env.NEON_DB,
    user: process.env.NEON_USER,
    password: process.env.NEON_PASSWORD,
    ssl: { rejectUnauthorized: false },
    max: 1,
  })
}

const LLM_CONFIG = {
  minimax: { url: 'https://api.minimax.io/v1/text/chatcompletion_v2', model: 'MiniMax-M2.7' }
}

const LLM_KEY = 'sk-cp-kewjUeaiHUlb-tvKgHb4JIOJt2-GrY6Uj9Y-hPFvOq3QyBsGAlbSQIw-eT7XERlLNrQ2l1-sy42pHSfGloIP46fp52OaX76Z8s6T5MkXMi0CObEeaa5JxFI'

const AGENTS = {
  paco: {
    name: 'Paco',
    role: 'Director de operaciones',
    system: `Eres Paco, el director de operaciones de MyCompi. 
Tu trabajo es coordinar el equipo, supervisar tareas y asegurarte de que todo funcione smoothly.
Tienes acceso a: tareas pendientes, estado de onboarding, clientes.
Sé proactivo - si ves algo que necesita atención, dilo.
Responde de forma directa y clara, en español.`
  },
  lucia: {
    name: 'Lucía', 
    role: 'Agente de ventas',
    system: `Eres Lucía, la agente de ventas de MyCompi.
Tu trabajo es ayudar al cliente a aumentar sus ventas y leads.
Analiza oportunidades, sugiere estrategias, haz follow-ups.
Sé amable pero profesional. Responde en español.`
  },
  carlos: {
    name: 'Carlos',
    role: 'Agente financiero', 
    system: `Eres Carlos, el agente financiero de MyCompi.
Ayudas con: facturas, cobros, pagos, gastos, análisis financiero.
Sé preciso con los números. Responde en español.`
  }
}

async function callLLM(messages, agent) {
  const res = await fetch(LLM_CONFIG.minimax.url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${LLM_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      model: LLM_CONFIG.minimax.model, 
      messages: [{ role: 'system', content: agent.system }, ...messages], 
      max_tokens: 800
    })
  })
  if (!res.ok) throw new Error(`LLM error: ${res.status}`)
  const data = await res.json()
  return data?.choices?.[0]?.message?.content || ''
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

    const { agent_id, agent, message } = await req.json()

    if (!message) {
      return NextResponse.json({ error: 'Mensaje requerido' }, { status: 400, headers })
    }

    // Support both agent_id and agent (legacy)
    const selectedAgent = agent_id || agent || 'paco'

    const pool = getDbPool()

    // Check session
    const sessionResult = await pool.query(
      'SELECT user_id FROM sessions WHERE token = $1 AND expires_at > NOW()',
      [token]
    )

    if (sessionResult.rows.length === 0) {
      await pool.end()
      return NextResponse.json({ error: 'Sesion invalida' }, { status: 401, headers })
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

    // Check trial/usage
    const trialResult = await pool.query(
      'SELECT * FROM trial_status WHERE company_id = $1',
      [companyId]
    )

    if (trialResult.rows.length > 0) {
      const trial = trialResult.rows[0]
      
      // Check if trial expired
      if (trial.trial_ends_at && new Date(trial.trial_ends_at) < new Date()) {
        await pool.end()
        return NextResponse.json({ 
          error: 'Trial expirado',
          reason: 'trial_expired',
          trial_ends_at: trial.trial_ends_at
        }, { status: 403, headers })
      }

      // Check daily limit
      const DAILY_LIMIT = 50
      if (trial.messages_used_today >= DAILY_LIMIT) {
        await pool.end()
        return NextResponse.json({ 
          error: 'Limite diario alcanzado',
          reason: 'daily_limit',
          messages_used_today: trial.messages_used_today,
          limit: DAILY_LIMIT
        }, { status: 403, headers })
      }

      // Increment usage
      await pool.query(
        'UPDATE trial_status SET messages_used_today = messages_used_today + 1 WHERE company_id = $1',
        [companyId]
      )
    }

    // Get agent config
    const agentConfig = AGENTS[selectedAgent] || AGENTS.paco

    // Call LLM
    const response = await callLLM([
      { role: 'user', content: message }
    ], agentConfig)

    // Save conversation to learning
    await pool.query(
      `INSERT INTO learning_interactions (company_id, agent_id, user_message, agent_response, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [companyId, selectedAgent, message, response]
    )

    await pool.end()

    return NextResponse.json({
      success: true,
      agent: agentConfig.name,
      response,
      usage: {
        messages_used_today: trialResult.rows[0]?.messages_used_today + 1 || 1
      }
    }, { status: 200, headers })

  } catch (err) {
    console.error('Chat error:', err)
    return NextResponse.json({ 
      success: false,
      error: err.message 
    }, { status: 500, headers })
  }
}
