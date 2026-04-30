// CRON: Daily summary email - 8am UTC on workdays only
import { NextResponse } from 'next/server'

const RESEND_API_KEY = process.env.RESEND_API_KEY

// Check if today is a workday (Mon-Fri, not Spanish holidays)
function isWorkday(): boolean {
  const today = new Date()
  const dayOfWeek = today.getUTCDay()
  
  // 0 = Sunday, 6 = Saturday → weekend
  if (dayOfWeek === 0 || dayOfWeek === 6) return false
  
  // Spanish holidays 2026 (simplified - add more as needed)
  const holidays2026 = [
    '2026-01-01', // Año Nuevo
    '2026-01-06', // Reyes
    '2026-04-03', // Viernes Santo
    '2026-05-01', // Día del Trabajo
    '2026-08-15', // Asunción
    '2026-10-12', // Hispanidad
    '2026-11-01', // Todos los Santos
    '2026-12-06', // Constitución
    '2026-12-08', // Inmaculada
    '2026-12-25', // Navidad
  ]
  
  const todayStr = today.toISOString().split('T')[0]
  if (holidays2026.includes(todayStr)) return false
  
  return true
}

function getMotivationalEmail(companyName: string, day: string): { subject: string; html: string } {
  const messages = [
    `Cada día es una oportunidad para hacer crecer ${companyName}. ¡Vamos!`,
    `El éxito de ${companyName} se construye día a día. ¡Sigue así!`,
    `Hoy es un gran día para avanzar con ${companyName}. ¡Tú puedes!`,
  ]
  const msg = messages[Math.floor(Math.random() * messages.length)]
  
  return {
    subject: `💡 ${day} - Mensaje motivador para ${companyName}`,
    html: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${day}</title>
</head>
<body style="margin:0;padding:0;background:#0D0D0D;font-family:system-ui,sans-serif;">
  <div style="max-width:600px;margin:40px auto;padding:0 20px;">
    <div style="background:#1A1A1A;border-radius:16px;overflow:hidden;border:1px solid #2A2A2A;">
      <div style="background:#FFD054;padding:32px;text-align:center;">
        <div style="font-size:48px;margin-bottom:16px;">🌅</div>
        <div style="font-size:22px;font-weight:700;color:#0D0D0D;">¡Buenos días, ${companyName}!</div>
      </div>
      <div style="padding:40px 32px;text-align:center;">
        <p style="font-size:18px;color:#E5E5E5;line-height:1.7;margin-bottom:24px;">
          ${msg}
        </p>
        <p style="font-size:14px;color:#888888;margin-bottom:32px;">
          Tu AI team sigue trabajando en las tareas.<br/>
          Cuando estés listo, revisa el dashboard.
        </p>
        <a href="https://www.mycompi.com/dashboard" style="display:inline-block;background:#FFD054;color:#0D0D0D;font-weight:700;padding:14px 32px;border-radius:9999px;text-decoration:none;font-size:15px;">
          Ir al Dashboard →
        </a>
      </div>
      <div style="background:#0D0D0D;padding:20px 32px;text-align:center;">
        <p style="color:#666;font-size:12px;margin:0;">MyCompi - Tu equipo de IA trabajando 24/7</p>
      </div>
    </div>
  </div>
</body>
</html>`
  }
}

function getDailySummaryEmail(companyName: string, email: string, day: string, stats: any): { subject: string; html: string } {
  const completedSection = stats.completed > 0
    ? `<p style="margin:0 0 8px 0;"><span style="color:#10A37F;">✓</span> ${stats.completed} tarea${stats.completed > 1 ? 's' : ''} completada${stats.completed > 1 ? 's' : ''}</p>`
    : ''

  const pendingSection = stats.pending > 0
    ? `<p style="margin:0 0 8px 0;"><span style="color:#FFD054;">⟳</span> ${stats.pending} en progreso</p>`
    : ''

  return {
    subject: `📋 ${day} - Resumen para ${companyName}`,
    html: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Resumen ${day}</title>
</head>
<body style="margin:0;padding:0;background:#0D0D0D;font-family:system-ui,sans-serif;">
  <div style="max-width:600px;margin:40px auto;padding:0 20px;">
    <div style="background:#1A1A1A;border-radius:16px;overflow:hidden;border:1px solid #2A2A2A;">
      <div style="background:#2D3261;padding:32px;">
        <div style="font-size:22px;font-weight:700;color:#FFD054;">Buenos días, ${companyName}</div>
        <div style="font-size:14px;color:#888;margin-top:4px;">${day}</div>
      </div>
      <div style="padding:32px;">
        <p style="font-size:16px;color:#E5E5E5;margin-bottom:24px;">
          Aquí tienes el resumen de tu equipo de IA:
        </p>
        <div style="background:#0D0D0D;border-radius:12px;padding:20px;margin-bottom:24px;">
          ${completedSection}
          ${pendingSection}
          <p style="margin:0 0 8px 0;"><span style="color:#888;">○</span> ${stats.proposals} propuesta${stats.proposals !== 1 ? 's' : ''} pendiente${stats.proposals !== 1 ? 's' : ''}</p>
          <p style="margin:0;"><span style="color:#FFD054;">⚡</span> ${stats.credits} credits disponibles</p>
        </div>
        ${stats.nextTask ? `<p style="font-size:14px;color:#888;margin-bottom:24px;">Siguiente: <strong style="color:#E5E5E5;">${stats.nextTask}</strong></p>` : ''}
        <div style="text-align:center;">
          <a href="https://www.mycompi.com/dashboard" style="display:inline-block;background:#FFD054;color:#0D0D0D;font-weight:700;padding:14px 32px;border-radius:9999px;text-decoration:none;font-size:15px;">
            Ver Dashboard →
          </a>
        </div>
      </div>
      <div style="background:#0D0D0D;padding:20px 32px;text-align:center;">
        <p style="color:#666;font-size:12px;margin:0;">MyCompi - Tu equipo de IA trabajando 24/7 · ¿Preguntas? Responde a este email</p>
      </div>
    </div>
  </div>
</body>
</html>`
  }
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'MyCompi <daily@mycompi.com>',
        to: [to],
        subject,
        html
      })
    })
    return res.ok
  } catch (e) {
    console.error('Email send error:', e)
    return false
  }
}

export async function GET(req: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }

  try {
    // Check if workday
    if (!isWorkday()) {
      return NextResponse.json({ 
        message: 'No es día laboral - no se envían emails',
        is_workday: false,
        date: new Date().toISOString().split('T')[0]
      }, { status: 200, headers })
    }

    const { Pool } = require('pg')
    const pool = new Pool({
      host: process.env.NEON_HOST,
      database: process.env.NEON_DB,
      user: process.env.NEON_USER,
      password: process.env.NEON_PASSWORD,
      ssl: true,
      max: 1,
    })

    // Get all companies with users
    const companies = await pool.query(`
      SELECT DISTINCT c.id, c.name, u.email,
             c.mission_statement, c.credits_total, c.credits_used
      FROM companies c
      JOIN app_user u ON u.company_id = c.id
      WHERE u.email IS NOT NULL
      LIMIT 100
    `)

    const day = new Date().toLocaleDateString('es', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    })

    const results = []
    
    // Check if we have recent daily email sent today (idempotency)
    const todayStart = new Date().toISOString().split('T')[0]
    
    for (const company of companies.rows) {
      const creditsRemaining = (company.credits_total || 5) - (company.credits_used || 0)
      
      // Get task stats
      const taskStats = await pool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'completed' AND completed_at > NOW() - INTERVAL '24 hours') as completed,
          COUNT(*) FILTER (WHERE status IN ('pending', 'approved', 'running')) as pending
        FROM mission_tasks 
        WHERE company_id = $1
      `, [company.id])

      // Get proposals count
      const proposalStats = await pool.query(`
        SELECT COUNT(*) as proposals 
        FROM proposals 
        WHERE company_id = $1 AND status = 'proposed'
      `, [company.id])

      const stats = {
        completed: parseInt(taskStats.rows[0]?.completed || 0),
        pending: parseInt(taskStats.rows[0]?.pending || 0),
        proposals: parseInt(proposalStats.rows[0]?.proposals || 0),
        credits: creditsRemaining,
        nextTask: null
      }

      // Send daily summary
      const email = getDailySummaryEmail(company.name, company.email, day, stats)
      const sent = await sendEmail(company.email, email.subject, email.html)
      
      results.push({
        company_id: company.id,
        company_name: company.name,
        email: company.email,
        sent,
        stats
      })
    }

    await pool.end()

    return NextResponse.json({
      date: todayStart,
      is_workday: true,
      day,
      companies_processed: companies.rows.length,
      results
    }, { status: 200, headers })

  } catch (err) {
    console.error('Daily summary error:', err)
    return NextResponse.json({ error: err.message }, { status: 500, headers })
  }
}
