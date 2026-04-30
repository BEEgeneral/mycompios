/**
 * Outreach Service - Polsia-style sales email automation
 * 
 * Creates and manages outreach sequences for leads
 */

import { Pool } from 'pg'
import { randomUUID } from 'crypto'

const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_TRtcXVky_54TGjwu7juDeY9cbQFCW2Ahj'
const FROM_EMAIL = 'MyCompi <laura@mycompi.com>'
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.mycompi.com'

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

export interface Lead {
  id: string
  company_id: string
  email: string
  name: string
  company_name?: string
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'rejected'
  source: string
  notes?: string
}

export interface OutreachSequence {
  id: string
  name: string
  subject_line: string
  template: string
  delay_days: number
  step_number: number
  is_active: boolean
}

// Templates for outreach sequences
const OUTREACH_TEMPLATES = {
  cold_1: {
    subject: 'Quick question about {{company_name}}',
    delay_days: 0,
    template: `Hola {{name}},

Vi que {{company_name}} {{pain_point}}. 

Mi cliente similar {{success_case}} en {{time_measure}}.

¿10 min esta semana para mostrarte cómo?

Saludos,
Laura`
  },
  cold_2: {
    subject: 'Re: Quick question about {{company_name}}',
    delay_days: 3,
    template: `Hola {{name}},

Te escribo porque no pude darte contexto adicional sobre cómo ayudamos a empresas como {{company_name}}.

En 3 meses ayudamos a {{similar_company}} a {{result}}.

¿Tienes 15 min mañana o el viernes?

Laura`
  },
  follow_up: {
    subject: 'Following up - {{company_name}}',
    delay_days: 7,
    template: `Hola {{name}},

Último intento. Si {{company_name}} ya tiene esto resuelto, simplemente dime y dejo de molestar.

Si no, me encantaría mostrarte cómo {{our_solution}} para empresas como la tuya.

¿Jueves o viernes?

Laura`
  },
  demo_offer: {
    subject: 'Demo rápido para {{company_name}}',
    delay_days: 1,
    template: `Hola {{name}},

¿Interesado/a en ver MyCompi en acción?

Duración: 20 min
Resultado: Tienes un plan de automatización para tu negocio

¿Puedo agendarte?

Laura`
  }
}

interface PersonalizationVars {
  name: string
  company_name: string
  pain_point?: string
  success_case?: string
  time_measure?: string
  similar_company?: string
  result?: string
  our_solution?: string
}

/**
 * Personalize template with lead data
 */
function personalizeTemplate(template: string, vars: PersonalizationVars): string {
  let result = template
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || '')
  }
  return result
}

/**
 * Send email via Resend
 */
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html })
    })
    return res.ok
  } catch (e) {
    console.error('Send email error:', e)
    return false
  }
}

/**
 * Create HTML email from plain text template
 */
function createHtmlEmail(content: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #2D3261, #4A4E8A); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">MyCompi</h1>
        <p style="color: #FFD054; margin: 10px 0 0;">Tu equipo IA trabajando 24/7</p>
      </div>
      <div style="padding: 30px; background: #f9f9f9; border-radius: 0 0 12px 12px;">
        <div style="white-space: pre-wrap; font-size: 16px; line-height: 1.6; color: #333;">
${content}
        </div>
        <div style="margin-top: 30px; text-align: center;">
          <a href="${FRONTEND_URL}/checkout" style="background: #2D3261; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Comenzar ahora →
          </a>
        </div>
        <p style="color: #888; font-size: 13px; margin-top: 30px; text-align: center;">
          MyCompi — Tu equipo IA por 49€/mes · Sin permanencia
        </p>
      </div>
    </div>
  `
}

/**
 * Create a new lead
 */
export async function createLead(data: {
  company_id: string
  email: string
  name: string
  company_name?: string
  source: string
  notes?: string
}): Promise<Lead> {
  const pool = getPool()
  const id = randomUUID()
  
  const result = await pool.query(
    `INSERT INTO leads (id, company_id, email, name, company_name, status, source, notes)
     VALUES ($1, $2, $3, $4, $5, 'new', $6, $7)
     RETURNING *`,
    [id, data.company_id, data.email, data.name, data.company_name || '', data.source, data.notes || '']
  )
  
  await pool.end()
  return result.rows[0]
}

/**
 * Add lead to outreach sequence
 */
export async function addToSequence(
  leadId: string,
  sequenceType: 'cold' | 'followup' | 'demo'
): Promise<void> {
  const pool = getPool()
  
  // Create sequence steps for the lead
  const steps = []
  if (sequenceType === 'cold') {
    steps.push({ template: 'cold_1', delay_days: 0, step: 1 })
    steps.push({ template: 'cold_2', delay_days: 3, step: 2 })
    steps.push({ template: 'follow_up', delay_days: 7, step: 3 })
  } else if (sequenceType === 'demo') {
    steps.push({ template: 'demo_offer', delay_days: 0, step: 1 })
    steps.push({ template: 'follow_up', delay_days: 3, step: 2 })
  }
  
  for (const step of steps) {
    await pool.query(
      `INSERT INTO outreach_queue (id, lead_id, sequence_type, step_number, template_key, status, scheduled_for)
       VALUES ($1, $2, $3, $4, $5, 'pending', NOW() + INTERVAL '${step.delay_days} days')`,
      [randomUUID(), leadId, sequenceType, step.step, step.template]
    )
  }
  
  await pool.end()
}

/**
 * Process outreach queue - called by Celery Beat every hour
 */
export async function processOutreachQueue(): Promise<{
  processed: number
  sent: number
  errors: number
}> {
  const pool = getPool()
  let processed = 0, sent = 0, errors = 0
  
  try {
    // Get pending outreach items
    const pending = await pool.query(
      `SELECT oq.*, l.email, l.name, l.company_name, c.name as company_name_full
       FROM outreach_queue oq
       JOIN leads l ON l.id = oq.lead_id
       JOIN companies c ON c.id = l.company_id
       WHERE oq.status = 'pending'
       AND oq.scheduled_for <= NOW()
       LIMIT 10`
    )
    
    for (const item of pending.rows) {
      const templateKey = item.template_key as keyof typeof OUTREACH_TEMPLATES
      const template = OUTREACH_TEMPLATES[templateKey]
      
      if (!template) continue
      
      // Personalize
      const vars: PersonalizationVars = {
        name: item.name || 'there',
        company_name: item.company_name_full || item.company_name || 'tu empresa',
        pain_point: 'está creciendo y necesita automatización',
        success_case: 'redujo horas de trabajo manual un 70%',
        time_measure: '3 meses',
        similar_company: 'una startup como la tuya',
        result: 'automatizó procesos clave',
        our_solution: 'hemos logrado resultados similares'
      }
      
      const subject = personalizeTemplate(template.subject, vars)
      const body = personalizeTemplate(template.template, vars)
      const html = createHtmlEmail(body)
      
      // Send
      const success = await sendEmail(item.email, subject, html)
      
      if (success) {
        await pool.query(
          'UPDATE outreach_queue SET status = $1, sent_at = NOW() WHERE id = $2',
          ['sent', item.id]
        )
        await pool.query(
          'UPDATE leads SET status = $1 WHERE id = $2',
          ['contacted', item.lead_id]
        )
        sent++
      } else {
        await pool.query(
          'UPDATE outreach_queue SET status = $1 WHERE id = $2',
          ['failed', item.id]
        )
        errors++
      }
      
      processed++
    }
    
  } catch (e) {
    console.error('Outreach queue error:', e)
  } finally {
    await pool.end()
  }
  
  return { processed, sent, errors }
}

/**
 * Get outreach stats for a company
 */
export async function getOutreachStats(companyId: string): Promise<{
  total_leads: number
  contacted: number
  qualified: number
  converted: number
  pending_emails: number
}> {
  const pool = getPool()
  
  const result = await pool.query(`
    SELECT 
      COUNT(*) as total_leads,
      COUNT(*) FILTER (WHERE status = 'contacted') as contacted,
      COUNT(*) FILTER (WHERE status = 'qualified') as qualified,
      COUNT(*) FILTER (WHERE status = 'converted') as converted,
      (SELECT COUNT(*) FROM outreach_queue oq JOIN leads l ON l.id = oq.lead_id WHERE l.company_id = $1 AND oq.status = 'pending') as pending_emails
    FROM leads WHERE company_id = $1
  `, [companyId])
  
  await pool.end()
  const row = result.rows[0]
  
  return {
    total_leads: parseInt(row.total_leads) || 0,
    contacted: parseInt(row.contacted) || 0,
    qualified: parseInt(row.qualified) || 0,
    converted: parseInt(row.converted) || 0,
    pending_emails: parseInt(row.pending_emails) || 0
  }
}