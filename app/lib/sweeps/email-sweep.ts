/**
 * Email Sweep - Polsia-style email automation
 * 
 * Based on Polsia's celery_app/tasks/email_sweep.py
 * Runs every 3 hours
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
 * Analyze inbox and suggest actions
 */
async function analyzeInbox(company: any, emails: string[]): Promise<string[]> {
  if (!emails.length) {
    return []
  }

  const prompt = `Eres el agente de Email de MyCompi.

Empresa: ${company.name}

EMAILS RECIBIDOS:
${emails.map((e, i) => `${i + 1}. ${e}`).join('\n')}

Analiza y responde en español:
1. Cuales son leads potenciales?
2. Cuales son soporte?
3. Cuales son spam o no relevantes?

Formato: JSON array con {index, type, priority, action}
Solo incluye los que requieren acción.`

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
 * Draft email response
 */
async function draftResponse(company: any, emailContent: string, emailType: string): Promise<string> {
  const prompt = `Eres el agente de Email de MyCompi para ${company.name}.

Email recibido: ${emailContent}
Tipo: ${emailType}

Redacta una RESPUESTA PROFESIONAL en español:
- Máximo 3 párrafos
- Tono amigable pero profesional
- Incluir cierre con nombre de la empresa

Solo responde con el email, no con explicaciones.`

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
  return data?.choices?.[0]?.message?.content || ''
}

/**
 * Run email sweep
 */
export async function runEmailSweep(companyId?: string): Promise<{
  success: boolean
  emails_analyzed: number
  drafts_created: number
  actions: string[]
  error?: string
}> {
  console.log('[EmailSweep] Starting sweep', { companyId })

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

    // Simulate emails (in production, connect to email API like Resend)
    const mockEmails = [
      'Hola, me interesa saber más sobre sus servicios',
      'Tengo un problema con mi cuenta',
      'vi su anuncio y quiero información de precios',
    ]

    // Analyze inbox
    const analysis = await analyzeInbox(company, mockEmails)

    // Draft responses for priority emails
    const drafts: string[] = []
    for (let i = 0; i < Math.min(2, mockEmails.length); i++) {
      const draft = await draftResponse(company, mockEmails[i], 'lead')
      if (draft) drafts.push(draft)
    }

    // Save to memory
    await pool.query(
      `INSERT INTO memory_entries (id, company_id, entry_type, content, tags, source, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        randomUUID(),
        company.id,
        'result',
        'Email Sweep',
        `Emails: ${mockEmails.length}\nAnalysis: ${analysis}\nDrafts: ${drafts.length}`,
        ['email', 'sweep', 'automated'],
        'email_sweep'
      ]
    )

    // Log activity
    await pool.query(
      `INSERT INTO activity_log (id, company_id, agent_type, action, summary, level, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        randomUUID(),
        company.id,
        'support',
        'email_sweep_completed',
        `Analyzed ${mockEmails.length} emails, ${drafts.length} drafts`,
        'success'
      ]
    )

    await pool.end()

    console.log('[EmailSweep] Completed', { emails: mockEmails.length, drafts: drafts.length })

    return {
      success: true,
      emails_analyzed: mockEmails.length,
      drafts_created: drafts.length,
      actions: ['inbox_analyzed', 'drafts_created']
    }

  } catch (error) {
    console.error('[EmailSweep] Error:', error)
    await pool.end()
    return { success: false, emails_analyzed: 0, drafts_created: 0, actions: [], error: String(error) }
  }
}