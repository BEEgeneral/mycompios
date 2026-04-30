/**
 * Business Planning Agent - Strategic planning agent
 * Polsia-style: long-term strategy and KPI definition
 */

import { Pool } from 'pg'
import { randomUUID } from 'crypto'

const LLM_API_KEY = process.env.LLM_API_KEY || ''
const LLM_URL = 'https://api.minimax.io/v1/text/chatcompletion_v2'
const LLM_MODEL = 'MiniMax-M2.7'

function getPool() {
  return new Pool({
    host: process.env.NEON_HOST,
    port: 5432,
    database: process.env.NEON_DB,
    user: process.env.NEON_USER,
    password: process.env.NEON_PASSWORD,
    ssl: true,
  })
}

async function callLLM(prompt: string): Promise<string> {
  const res = await fetch(LLM_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LLM_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500
    })
  })
  const data = await res.json()
  return data?.choices?.[0]?.message?.content || 'No response'
}

export interface BusinessPlan {
  goals: string[]
  kpis: { name: string; target: string }[]
  strategies: string[]
  timeline: { phase: string; duration: string; objectives: string[] }[]
}

export async function runBusinessPlanning(context: {
  company_id: string
  company_name: string
  mission: string
  industry: string
  current_kpis?: any
  autonomy_mode: string
}): Promise<{ success: boolean; plan?: BusinessPlan; error?: string }> {
  console.log('[BusinessPlanning] Starting for', context.company_name)
  
  try {
    const prompt = `Eres el agente de Business Planning de MyCompi.

Empresa: ${context.company_name}
Misión: ${context.mission}
Industria: ${context.industry}
KPIAs actuales: ${JSON.stringify(context.current_kpis || {})}
Autonomy: ${context.autonomy_mode}

Genera un PLAN ESTRATÉGICO con:
1. 3 metas a 3/6/12 meses
2. KPIAs con targets específicos
3. 5 estrategias clave
4. Timeline con fases

Responde en JSON con {goals, kpis, strategies, timeline}`

    const response = await callLLM(prompt)
    
    // Try to parse JSON response
    let plan: BusinessPlan
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      plan = jsonMatch ? JSON.parse(jsonMatch[0]) : {
        goals: ['Growth', 'Revenue', 'Retention'].map(g => `${g} target`),
        kpis: [{ name: 'MRR', target: '+20%' }],
        strategies: ['Content Marketing', 'Email Sequences', 'Social Media'],
        timeline: [{ phase: 'Q1', duration: '3 months', objectives: ['Launch', 'Scale', 'Retain'] }]
      }
    } catch {
      plan = {
        goals: ['Growth', 'Revenue', 'Retention'].map(g => `${g} target`),
        kpis: [{ name: 'MRR', target: '+20%' }],
        strategies: ['Content Marketing', 'Email Sequences', 'Social Media'],
        timeline: [{ phase: 'Q1', duration: '3 months', objectives: ['Launch', 'Scale', 'Retain'] }]
      }
    }

    // Store in memory
    const pool = getPool()
    await pool.query(
      `INSERT INTO memory_entries (id, company_id, entry_type, title, content, tags, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        randomUUID(),
        context.company_id,
        'result',
        'Business Plan Generated',
        JSON.stringify(plan),
        ['business', 'planning', 'strategy'],
        'business_planning_agent'
      ]
    )
    
    // Update company with new goals/kpis
    if (plan.kpis?.length) {
      await pool.query(
        `UPDATE companies SET goals = $2 WHERE id = $1`,
        [context.company_id, JSON.stringify(plan.goals)]
      )
    }
    
    await pool.end()
    
    return { success: true, plan }
    
  } catch (error) {
    console.error('[BusinessPlanning] Error:', error)
    return { success: false, error: String(error) }
  }
}
