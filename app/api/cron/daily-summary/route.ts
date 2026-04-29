// CRON: Daily summary email at 8am - COO Briefing style
import { NextResponse } from 'next/server'

const AGENT_EMOJI: Record<string, string> = {
  pelayo: '📊', lucia: '💼', marcos: '🔧',
  paco: '🎯', carlos: '💰', daniel: '📈', elena: '📋'
}

const AGENT_NAMES: Record<string, string> = {
  pelayo: 'Pelayo', lucia: 'Lucía', marcos: 'Marcos',
  paco: 'Paco', carlos: 'Carlos', daniel: 'Daniel', elena: 'Elena'
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: 'MyCompi <daily@mycompi.com>',
      to: [to],
      subject,
      html
    })
  })
  return res.ok
}

function buildEmailText(companyName: string, pending: any[], completed: any[], nextSteps: string[]) {
  const day = new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
  
  const pendingSection = pending.length > 0
    ? pending.map(t => `• ${t.task_name} — ${AGENT_NAMES[t.agent_id] || t.agent_id} está en ello`)
    : ['• Sin tareas activas ahora mismo']

  const completedSection = completed.length > 0
    ? completed.map(t => `• ${t.task_name} — completado por ${AGENT_NAMES[t.agent_id] || t.agent_id}`)
    : ['• Sin tareas completadas en las últimas 24h']

  const nextSection = nextSteps.length > 0
    ? nextSteps.map(s => `• ${s}`)
    : ['• Tareas autonomous en cola']

  return `
Ia,

Hoy es ${day}. Tu equipo de Compis ha estado trabajando.

EN MARCHA:
${pendingSection.join('\n')}

COMPLETADO (últimas 24h):
${completedSection.join('\n')}

PRÓXIMOS PASOS:
${nextSection.join('\n')}

Tu dashboard: https://mycompios.vercel.app/dashboard

— MyCompi (Tu equipo de IA trabajando 24/7)
`.trim()
}

function buildHtml(companyName: string, pending: any[], completed: any[], nextSteps: string[]) {
  const day = new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })

  const pendingItems = pending.length > 0
    ? pending.map(t => `
      <li style="margin-bottom:12px;padding-left:8px">
        <span style="margin-right:8px">${AGENT_EMOJI[t.agent_id] || '🤖'}</span>
        <strong>${t.task_name}</strong>
        <span style="color:#666;font-size:13px;margin-left:8px">— ${AGENT_NAMES[t.agent_id] || t.agent_id} está en ello</span>
      </li>`).join('')
    : '<li style="color:#999">Sin tareas activas ahora mismo</li>'

  const completedItems = completed.length > 0
    ? completed.map(t => `
      <li style="margin-bottom:12px;padding-left:8px;color:#166534">
        <span style="margin-right:8px">✅</span>
        <strong>${t.task_name}</strong>
        <span style="color:#666;font-size:13px;margin-left:8px">— completado por ${AGENT_NAMES[t.agent_id] || t.agent_id}</span>
      </li>`).join('')
    : '<li style="color:#999">Sin tareas completadas en las últimas 24h</li>'

  const nextItems = nextSteps.length > 0
    ? nextSteps.map(s => `<li style="margin-bottom:8px;padding-left:8px">→ ${s}</li>`).join('')
    : '<li style="color:#999">Tareas autonomous en cola</li>'

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Tu resumo MyCompi</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Poppins',Segoe UI,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    
    <!-- HEADER -->
    <div style="background:#2D3261;padding:28px 36px;">
      <div style="color:#FFD154;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">MyCompi — Daily Briefing</div>
      <div style="color:#ffffff;font-size:22px;font-weight:700;">¡Buenos días, ${companyName}!</div>
      <div style="color:#D1E0F3;font-size:14px;margin-top:6px;">${day.charAt(0).toUpperCase() + day.slice(1)}</div>
    </div>
    
    <!-- INTRO -->
    <div style="padding:28px 36px 0 36px;border-bottom:1px solid #f0f0f0;">
      <p style="color:#333;font-size:15px;line-height:1.7;margin:0;">
        Tu equipo de Compis ha estado trabajando. Aquí tienes el estado actual:
      </p>
    </div>
    
    <!-- EN MARCHA -->
    <div style="padding:24px 36px 0 36px;">
      <h2 style="font-size:13px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:1px;margin:0 0 16px 0;">⏳ En marcha</h2>
      <ul style="margin:0;padding:0;list-style:none;">
        ${pendingItems}
      </ul>
    </div>
    
    <!-- COMPLETADO -->
    <div style="padding:24px 36px 0 36px;">
      <h2 style="font-size:13px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:1px;margin:0 0 16px 0;">✅ Completado</h2>
      <ul style="margin:0;padding:0;list-style:none;">
        ${completedItems}
      </ul>
    </div>
    
    <!-- PRÓXIMOS PASOS -->
    <div style="padding:24px 36px 28px 36px;">
      <h2 style="font-size:13px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:1px;margin:0 0 16px 0;">→ Próximos pasos</h2>
      <ul style="margin:0;padding:0;list-style:none;">
        ${nextItems}
      </ul>
    
    <!-- FOOTER -->
    <div style="background:#f8f8f8;padding:20px 36px;text-align:center;">
      <a href="https://mycompios.vercel.app/dashboard" style="display:inline-block;background:#FFD054;color:#2D3261;font-weight:700;padding:10px 24px;border-radius:9999px;text-decoration:none;font-size:14px;">Ver dashboard →</a>
      <p style="color:#999;font-size:12px;margin:16px 0 0 0;">MyCompi — Tu equipo de IA trabajando 24/7</p>
    </div>
  </div>
</body>
</html>`
}

export async function GET(req: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  
  try {
    const { Pool } = require('pg')
    const pool = new Pool({
      host: process.env.NEON_HOST,
      database: process.env.NEON_DB,
      user: process.env.NEON_USER,
      password: process.env.NEON_PASSWORD,
      ssl: true,
      max: 1,
    })
    
    const results = []
    
    const companies = await pool.query(`
      SELECT DISTINCT c.id, c.name, c.email
      FROM companies c
      JOIN missions m ON m.company_id = c.id
      WHERE m.status = 'active'
    `)
    
    for (const company of companies.rows) {
      if (!company.email) continue
      
      const pending = await pool.query(`
        SELECT mt.task_name, mt.agent_id, mt.priority
        FROM mission_tasks mt
        WHERE mt.company_id = $1 AND mt.status != 'completed'
        ORDER BY mt.priority DESC
        LIMIT 3
      `, [company.id])
      
      const completed = await pool.query(`
        SELECT mt.task_name, mt.agent_id
        FROM mission_tasks mt
        WHERE mt.company_id = $1 AND mt.status = 'completed'
        AND mt.completed_at > NOW() - INTERVAL '24 hours'
        ORDER BY mt.completed_at DESC
        LIMIT 3
      `, [company.id])

      // Next steps = pending tasks with lower priority
      const nextSteps = pending.rows.slice(2).map((t: any) => t.task_name)
      
      if (pending.rows.length === 0 && completed.rows.length === 0) continue
      
      const plainText = buildEmailText(company.name, pending.rows, completed.rows, nextSteps)
      const html = buildHtml(company.name, pending.rows, completed.rows, nextSteps)
      
      const sent = await sendEmail(
        company.email,
        `Tu resumo MyCompi — ${new Date().toLocaleDateString('es')}`,
        html
      )
      
      results.push({
        company: company.name,
        email: company.email,
        pending_count: pending.rows.length,
        completed_count: completed.rows.length,
        sent
      })
    }
    
    await pool.end()
    
    return NextResponse.json({
      success: true,
      emails_sent: results.filter((r: any) => r.sent).length,
      results
    }, { status: 200, headers })
    
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers })
  }
}
