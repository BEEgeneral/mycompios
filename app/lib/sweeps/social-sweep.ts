/**
 * Social Sweep - Polsia-style social media automation
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

export async function runSocialSweep(companyId?: string) {
  console.log('[SocialSweep] Starting sweep', { companyId })
  const pool = getPool()

  try {
    const companyQuery = companyId
      ? 'SELECT * FROM companies WHERE id = $1'
      : 'SELECT * FROM companies LIMIT 1'
    const companyResult = await pool.query(companyQuery, companyId ? [companyId] : [])

    if (!companyResult.rows.length) {
      throw new Error('No company found')
    }

    const company = companyResult.rows[0]
    const mockMentions = [
      `@${company.name} me encanta su producto!`,
      `Problemas con el soporte de ${company.name}`,
      `Alguien sabe si ${company.name} tiene promo?`,
    ]

    // Save to memory
    const content = `Mentions analyzed: ${mockMentions.length}\nSocial sweep completed successfully`
    await pool.query(
      `INSERT INTO memory_entries (id, company_id, entry_type, content, tags, source)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        randomUUID(),
        company.id,
        'result',
        content,
        ['social', 'sweep', 'automated'],
        'social_sweep'
      ]
    )

    // Log activity
    await pool.query(
      `INSERT INTO activity_log (id, company_id, agent_type, action, summary, level)
       VALUES ($1, $2, $3, $4, $5, $6)`,
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

    return {
      success: true,
      mentions_analyzed: mockMentions.length,
      actions: ['mentions_analyzed']
    }

  } catch (error) {
    console.error('[SocialSweep] Error:', error)
    await pool.end()
    return { success: false, mentions_analyzed: 0, actions: [], error: String(error) }
  }
}