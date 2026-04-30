/**
 * Social Sweep - Polsia-style social media automation
 * 
 * Based on Polsia's celery_app/tasks/social_sweep.py
 * Runs every 2 hours
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

/**
 * Analyze social mentions using LLM
 */
async function analyzeMentions(company: any, mentions: string[]): Promise<string[]> {
  if (!mentions.length) {
    return []
  }

  const prompt = `Eres el agente de Social Media de MyCompi.

Empresa: ${company.name}
Industria: ${company.industry || 'General'}

MENÇÕES RECIBIDAS:
${mentions.map((m, i) => `${i + 1}. ${m}`).join('\n')}

Analiza y responde en español:
1. Cuales son positivas, negativas o neutrales?
2. Hay oportunidad de engagement?
3. Cuales requieren respuesta?

Formato: JSON array con {index, sentiment, action, response}
Solo incluye las que requieren acción.`

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
  return data?.choices?.[0]?.message?.content || '[]'
}

/**
 * Generate social content idea
 */
async function generateContentIdea(company: any): Promise<string> {
  const prompt = `Eres el agente de Social Media de MyCompi.

Empresa: ${company.name}
Misión: ${company.mission_statement || ''}
Industria: ${company.industry || 'General'}

Genera una IDEA DE CONTENIDO para redes sociales:
- Formato: Post corto (máx 150 caracteres)
- Tono: Profesional pero cercano
- Incluir: hashtag relevante

Responde solo con el post, sin explicaciones.`

  const res = await fetch(LLM_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LLM_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200
    })
  })

  const data = await res.json()
  return data?.choices?.[0]?.message?.content || ''
}

/**
 * Run social sweep
 */
export async function runSocialSweep(companyId?: string): Promise<{
  success: boolean
  mentions_analyzed: number
  content_created?: string
  actions: string[]
  error?: string
}> {
  console.log('[SocialSweep] Starting sweep', { companyId })

  const pool = getPool()

  try {
    // Get company
    const companyQuery = companyId
      ? 'SELECT * FROM companies WHERE id = $1'
      : 'SELECT * FROM companies LIMIT 1'
    const companyResult = await pool.query(companyQuery, companyId ? [companyId] : [])

    if (!companyResult.rows.length) {
      throw new Error('No company found')
    }

    const company = companyResult.rows[0]

    // Simulate mentions (in production, connect to social APIs)
    const mockMentions = [
      `@${company.name} me encanta su producto!`,
      `Problemas con el soporte de ${company.name}`,
      `Alguien sabe si ${company.name} tiene promo?`,
    ]

    // Analyze mentions
    const analysis = await analyzeMentions(company, mockMentions)

    // Generate content idea
    const contentIdea = await generateContentIdea(company)

    // Save to memory
    await pool.query(
      `INSERT INTO memory_entries (id, company_id, entry_type, content, tags, source, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        randomUUID(),
        company.id,
        'result',
        'Social Sweep',
        `Mentions: ${mockMentions.length}\nAnalysis: ${analysis}\nContent: ${contentIdea}`,
        ['social', 'sweep', 'automated'],
        'social_sweep'
      ]
    )

    // Log activity
    await pool.query(
      `INSERT INTO activity_log (id, company_id, agent_type, action, summary, level, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        randomUUID(),
        company.id,
        'social',
        'social_sweep_completed',
        `Analyzed ${mockMentions.length} mentions`,
        'success'
      ]
    )

    await pool.end()

    console.log('[SocialSweep] Completed', { mentions: mockMentions.length })

    return {
      success: true,
      mentions_analyzed: mockMentions.length,
      content_created: contentIdea,
      actions: ['mentions_analyzed']
    }

  } catch (error) {
    console.error('[SocialSweep] Error:', error)
    await pool.end()
    return { success: false, mentions_analyzed: 0, actions: [], error: String(error) }
  }
}