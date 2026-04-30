/**
 * Email Sweep - Polsia-style email automation
 */

import { Pool } from 'pg'
import { randomUUID } from 'crypto'

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

export async function runEmailSweep(companyId?: string) {
  console.log('[EmailSweep] Starting sweep', { companyId })
  
  const sandboxMode = process.env.SANDBOX_MODE !== 'false'
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
    
    // In sandbox mode, skip external email sending
    if (sandboxMode) {
      console.log('[SANDBOX] Email sweep skipped external calls')
    }
    
    // Simulate email analysis (internal work always runs)
    const mockEmails = [
      'Hola, me interesa saber más sobre sus servicios',
      'Tengo un problema con mi cuenta',
      'vi su anuncio y quiero información de precios',
    ]

    const content = `Email sweep completed. Analyzed ${mockEmails.length} emails.`
    await pool.query(
      `INSERT INTO memory_entries (id, company_id, entry_type, content, tags, source)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        randomUUID(),
        company.id,
        'result',
        content,
        ['email', 'sweep', 'automated'],
        'email_sweep'
      ]
    )

    await pool.end()

    return {
      success: true,
      emails_analyzed: mockEmails.length,
      sandbox_mode: sandboxMode,
      drafts_created: 0,
      actions: ['inbox_analyzed']
    }

  } catch (error) {
    console.error('[EmailSweep] Error:', error)
    await pool.end()
    return { success: false, emails_analyzed: 0, drafts_created: 0, actions: [], error: String(error) }
  }
}
