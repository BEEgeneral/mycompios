/**
 * Chat Service - Chat with agents
 */

import { Pool } from 'pg'
import { randomUUID } from 'crypto'

const LLM_URL = 'https://api.minimax.io/v1/text/chatcompletion_v2'
const LLM_MODEL = 'MiniMax-M2.7'
const LLM_KEY = process.env.LLM_API_KEY || ''

let pool: Pool | null = null

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.NEON_HOST,
      port: 5432,
      database: process.env.NEON_DB,
      user: process.env.NEON_USER,
      password: process.env.NEON_PASSWORD,
      ssl: true,
    })
  }
  return pool
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatResponse {
  response: string
  agent: string
  conversation_id: string
}

const AGENTS = {
  paco: { name: 'Paco', role: 'Director de operaciones', emoji: '🎯' },
  lucia: { name: 'Lucía', role: 'Agente de ventas', emoji: '💼' },
  carlos: { name: 'Carlos', role: 'Agente financiero', emoji: '💰' }
}

async function callLLM(messages: { role: string; content: string }[]): Promise<string> {
  try {
    const res = await fetch(LLM_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LLM_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages
      })
    })
    const data = await res.json()
    return data?.choices?.[0]?.message?.content || 'Lo siento, no pude procesar tu mensaje.'
  } catch (e) {
    return 'Error de conexión con el servicio de IA.'
  }
}

export async function saveConversation(
  companyId: string,
  agent: string,
  userMessage: string,
  assistantResponse: string
): Promise<string> {
  const db = getPool()
  const conversationId = randomUUID()
  
  await db.query(
    `INSERT INTO conversations (id, company_id, agent, messages, created_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [conversationId, companyId, agent, JSON.stringify([
      { role: 'user', content: userMessage },
      { role: 'assistant', content: assistantResponse }
    ])]
  )
  
  return conversationId
}

export async function getRecentConversations(companyId: string, limit = 5): Promise<any[]> {
  const db = getPool()
  const result = await db.query(
    `SELECT id, agent, messages, created_at FROM conversations 
     WHERE company_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [companyId, limit]
  )
  return result.rows
}

export async function getContext(companyId: string): Promise<{ memory: any[], tasks: any[], proposals: any[] }> {
  const db = getPool()
  
  const [memoryResult, tasksResult, proposalsResult] = await Promise.all([
    db.query('SELECT * FROM memory_entries WHERE company_id = $1 ORDER BY created_at DESC LIMIT 5', [companyId]),
    db.query('SELECT * FROM mission_tasks WHERE company_id = $1 AND status IN (pending,running) LIMIT 10', [companyId]),
    db.query('SELECT * FROM proposals WHERE company_id = $1 LIMIT 5', [companyId])
  ])
  
  return {
    memory: memoryResult.rows,
    tasks: tasksResult.rows,
    proposals: proposalsResult.rows
  }
}

export { AGENTS, callLLM }