// CRON: Daily summary email at 8am
import { NextResponse } from 'next/server'

const AGENT_EMOJI: Record<string, string> = {
  pelayo: '📊', lucia: '💼', marcos: '🔧',
  paco: '🎯', carlos: '💰', daniel: '📈', elena: '📋'
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

function buildHtml(companyName: string, pending: any[], completed: any[]) {
  const pendingRows = pending.length > 0
    ? pending.map(t => `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0">
          <span style="font-size:16px;margin-right:8px">${AGENT_EMOJI[t.agent_id] || '🤖'}</span>
          <strong>${t.task_name}</strong>
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;color:#666;font-size:14px">${t.agent_id}</td>
        <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0">
          <span style="background:#FEF3C7;color:#92400E;padding:4px 10px;border-radius:9999px;font-size:12px;font-weight:700">P${t.priority}</span>
        </td>
      </tr>`).join('')
    : `<tr><td style="padding:16px;color:#999" colspan="3">Sin tareas activas</td></tr>`

  const completedRows = completed.length > 0
    ? completed.map(t => `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0">
          <span style="font-size:16px;margin-right:8px">${AGENT_EMOJI[t.agent_id] || '🤖'}</span>
          <strong>${t.task_name}</strong>
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;color:#666;font-size:14px">${t.agent_id}</td>
        <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0">
          <span style="background:#DCFCE7;color:#166534;padding:4px 10px;border-radius:9999px;font-size:12px;font-weight:700">✅ Hecho</span>
        </td>
      </tr>`).join('')
    : `<tr><td style="padding:16px;color:#999" colspan="3">Sin tareas completadas</td></tr>`

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Tu resumen MyCompi</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Poppins',Segoe UI,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    <!-- HEADER -->
    <div style="background:#2D3261;padding:28px 36px;">
      <div style="color:#FFD154;font-size:22px;font-weight:700;">¡Buenos días, ${companyName}! 👋</div>
      <p style="color:#D1E0F3;font-size:14px;margin:8px 0 0 0;">Tu equipo de Compis ha estado trabajando</p>
    </div>
    
    <!-- IN PROGRESS -->
    <div style="padding:28px 36px 0 36px;">
      <h2 style="font-size:16px;font-weight:800;color:#2D3261;margin:0 0 16px 0;">📋 En marcha</h2>
      <table style="width:100%;border-collapse:collapse;background:#FAFAFA;border-radius:12px;overflow:hidden;">
        ${pendingRows}
      </table>
    </div>
    
    <!-- COMPLETED -->
    <div style="padding:20px 36px 28px 36px;">
      <h2 style="font-size:16px;font-weight:800;color:#2D3261;margin:0 0 16px 0;">✅ Completadas</h2>
      <table style="width:100%;border-collapse:collapse;background:#FAFAFA;border-radius:12px;overflow:hidden;">
        ${completedRows}
      </table>
    </div>
    
    <!-- FOOTER -->
    <div style="background:#f8f8f8;padding:20px 36px;text-align:center;">
      <p style="color:#999;font-size:12px;margin:0;">MyCompi - Tu equipo de IA trabajando 24/7</p>
      <a href="https://mycompios.vercel.app/dashboard" style="display:inline-block;margin-top:12px;background:#FFD054;color:#2D3261;font-weight:700;padding:10px 24px;border-radius:9999px;text-decoration:none;font-size:14px;">Ver dashboard →</a>
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
    
    // Get companies with active missions
    const companies = await pool.query(`
      SELECT DISTINCT c.id, c.name, c.email
      FROM companies c
      JOIN missions m ON m.company_id = c.id
      WHERE m.status = 'active'
    `)
    
    for (const company of companies.rows) {
      if (!company.email) continue
      
      // Get pending tasks (in progress)
      const pending = await pool.query(`
        SELECT mt.task_name, mt.agent_id, mt.priority
        FROM mission_tasks mt
        WHERE mt.company_id = $1 AND mt.status != 'completed'
        ORDER BY mt.priority DESC
        LIMIT 3
      `, [company.id])
      
      // Get completed tasks (last 24h)
      const completed = await pool.query(`
        SELECT mt.task_name, mt.agent_id
        FROM mission_tasks mt
        WHERE mt.company_id = $1 AND mt.status = 'completed'
        AND mt.completed_at > NOW() - INTERVAL '24 hours'
        ORDER BY mt.completed_at DESC
        LIMIT 3
      `, [company.id])
      
      if (pending.rows.length === 0 && completed.rows.length === 0) continue
      
      const html = buildHtml(company.name, pending.rows, completed.rows)
      const sent = await sendEmail(
        company.email,
        `¡Buenos días! Tu resumen de hoy - ${pending.rows.length + completed.rows.length} tareas`,
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
