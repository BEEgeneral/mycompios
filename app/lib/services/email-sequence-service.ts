/**
 * Email Sequence Service - D1, D3, D5, D7 campaigns
 */

import { Pool } from 'pg'

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

export interface EmailTemplate {
  subject: string
  html: string
  preview: string
}

// Email templates
export const EMAIL_TEMPLATES = {
  d1: {
    subject: 'Bienvenido a MyCompi - Empieza hoy',
    getHtml: (name: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Bienvenido a MyCompi</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
    <div style="background:#2D3261;padding:32px 40px;">
      <h1 style="color:#FFD154;margin:0;font-size:24px;">¡Bienvenido/a ${name}!</h1>
    </div>
    <div style="padding:40px;">
      <p style="font-size:16px;color:#333;line-height:1.6;">
        Hola ${name},<br><br>
        Tu equipo MyCompi está listo para trabajar. Мы已经开始 a analizar tu negocio y preparar las primeras recomendaciones.
      </p>
      <div style="margin:30px 0;text-align:center;">
        <a href="https://mycompi.com/dashboard" style="display:inline-block;background:#FFD154;color:#2D3261;padding:14px 32px;border-radius:9999px;text-decoration:none;font-weight:bold;">Ir al Dashboard</a>
      </div>
      <p style="font-size:14px;color:#666;margin-top:20px;">
        🎯 Tu primer informe estará listo en 24 horas
      </p>
    </div>
    <div style="background:#f8f9fa;padding:20px 40px;text-align:center;">
      <p style="color:#999;font-size:12px;margin:0;">MyCompi - Tu equipo IA 24/7</p>
    </div>
  </div>
</body>
</html>
    `
  },
  
  d3: {
    subject: 'Primeros insights de tu negocio',
    getHtml: (name: string, company: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Primeros insights</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
    <div style="background:#2D3261;padding:32px 40px;">
      <h1 style="color:#FFD154;margin:0;font-size:24px;">Insights Day 3</h1>
    </div>
    <div style="padding:40px;">
      <p style="font-size:16px;color:#333;line-height:1.6;">
        Hola ${name},<br><br>
        Ya hemos analizado ${company}. Aquí van los primeros datos:
      </p>
      <div style="background:#f8f9fa;padding:20px;border-radius:12px;margin:20px 0;">
        <p style="margin:0;font-size:14px;color:#666;">
          📊 <strong>3 tareas completadas</strong><br>
          📋 <strong>2 nuevas recomendaciones</strong><br>
          💡 <strong>1 insight de mercado</strong>
        </p>
      </div>
      <div style="margin:30px 0;text-align:center;">
        <a href="https://mycompi.com/dashboard" style="display:inline-block;background:#FFD154;color:#2D3261;padding:14px 32px;border-radius:9999px;text-decoration:none;font-weight:bold;">Ver Dashboard</a>
      </div>
    </div>
    <div style="background:#f8f9fa;padding:20px 40px;text-align:center;">
      <p style="color:#999;font-size:12px;margin:0;">MyCompi - Día 3 de tu trial</p>
    </div>
  </div>
</body>
</html>
    `
  },
  
  d5: {
    subject: 'Tu negocio necesita atención - Decision time',
    getHtml: (name: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Decision time</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
    <div style="background:#e74c3c;padding:32px 40px;">
      <h1 style="color:#fff;margin:0;font-size:24px;">⚠️ Quedan 2 días de trial</h1>
    </div>
    <div style="padding:40px;">
      <p style="font-size:16px;color:#333;line-height:1.6;">
        Hola ${name},<br><br>
        Tu trial de MyCompi termina en <strong>2 días</strong>. Hemos preparado un resumen de lo que hemos logrado juntos.
      </p>
      <div style="margin:30px 0;">
        <a href="https://mycompi.com/autonomous" style="display:block;background:#2D3261;color:#FFD154;padding:16px 24px;border-radius:12px;text-decoration:none;text-align:center;font-weight:bold;margin-bottom:12px;">🚀 Activar Modo Autónomo</a>
        <a href="https://mycompi.com/dashboard" style="display:block;background:#f8f9fa;color:#333;padding:16px 24px;border-radius:12px;text-decoration:none;text-align:center;">Ver progreso</a>
      </div>
    </div>
    <div style="background:#f8f9fa;padding:20px 40px;text-align:center;">
      <p style="color:#999;font-size:12px;margin:0;">MyCompi - Tu trial expira pronto</p>
    </div>
  </div>
</body>
</html>
    `
  },
  
  d7: {
    subject: '¿Qué pasó estos 7 días? Tu resumen semanal',
    getHtml: (name: string, company: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Resumen semanal</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
    <div style="background:#2D3261;padding:32px 40px;">
      <h1 style="color:#FFD154;margin:0;font-size:24px;">📊 Tu semana en MyCompi</h1>
    </div>
    <div style="padding:40px;">
      <p style="font-size:16px;color:#333;line-height:1.6;">
        Hola ${name},<br><br>
        ${company} tuvo una semanaproductive. Aquí está el resumen:
      </p>
      <div style="background:#f0f8ff;padding:20px;border-radius:12px;margin:20px 0;text-align:center;">
        <p style="font-size:32px;font-weight:bold;color:#2D3261;margin:0;">+12</p>
        <p style="font-size:14px;color:#666;margin:4px 0 0;">tareas completadas</p>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:20px 0;">
        <div style="background:#f8f9fa;padding:16px;border-radius:8px;text-align:center;">
          <p style="font-size:24px;font-weight:bold;margin:0;color:#27ae60;">85%</p>
          <p style="font-size:12px;color:#666;margin:4px 0 0;">efectividad</p>
        </div>
        <div style="background:#f8f9fa;padding:16px;border-radius:8px;text-align:center;">
          <p style="font-size:24px;font-weight:bold;margin:0;color:#e67e22;">8</p>
          <p style="font-size:12px;color:#666;margin:4px 0 0;">horas autónomas</p>
        </div>
      </div>
      <div style="margin:30px 0;text-align:center;">
        <a href="https://mycompi.com/autonomous" style="display:inline-block;background:#FFD154;color:#2D3261;padding:16px 32px;border-radius:9999px;text-decoration:none;font-weight:bold;font-size:16px;">Ver informe completo</a>
      </div>
    </div>
    <div style="background:#f8f9fa;padding:20px 40px;text-align:center;">
      <p style="color:#999;font-size:12px;margin:0;">MyCompi - Tu semana 1</p>
    </div>
  </div>
</body>
</html>
    `
  },
  
  nps: {
    subject: '¿Cómo vamos? Tu opinión importa',
    getHtml: (name: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Feedback</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
    <div style="padding:40px;text-align:center;">
      <h1 style="color:#2D3261;font-size:24px;margin:0 0 20px;">¿Cómo vamos?</h1>
      <p style="color:#666;font-size:16px;margin:0 0 30px;">Tu opinión nos ayuda a mejorar MyCompi</p>
      <div style="display:flex;justify-content:center;gap:12px;margin:30px 0;">
        <a href="https://mycompi.com/feedback?score=1" style="width:48px;height:48px;border-radius:50%;background:#ff6b6b;color:#fff;text-decoration:none;line-height:48px;font-size:20px;">1</a>
        <a href="https://mycompi.com/feedback?score=2" style="width:48px;height:48px;border-radius:50%;background:#ffa502;color:#fff;text-decoration:none;line-height:48px;font-size:20px;">2</a>
        <a href="https://mycompi.com/feedback?score=3" style="width:48px;height:48px;border-radius:50%;background:#ffd93d;color:#333;text-decoration:none;line-height:48px;font-size:20px;">3</a>
        <a href="https://mycompi.com/feedback?score=4" style="width:48px;height:48px;border-radius:50%;background:#6bcb77;color:#fff;text-decoration:none;line-height:48px;font-size:20px;">4</a>
        <a href="https://mycompi.com/feedback?score=5" style="width:48px;height:48px;border-radius:50%;background:#27ae60;color:#fff;text-decoration:none;line-height:48px;font-size:20px;">5</a>
      </div>
      <p style="color:#999;font-size:12px;">1 = Mal | 5 = Excelente</p>
    </div>
  </div>
</body>
</html>
    `
  }
}

export async function getSequenceStatus(companyId: string): Promise<any | null> {
  const db = getPool()
  const result = await db.query(
    'SELECT * FROM email_sequence_status WHERE company_id = $1',
    [companyId]
  )
  await db.end()
  return result.rows[0] || null
}

export async function initSequence(companyId: string): Promise<void> {
  const db = getPool()
  await db.query(
    `INSERT INTO email_sequence_status (company_id, email_d1_sent, email_d3_sent, email_d5_sent, email_d7_sent, nps_sent)
     VALUES ($1, false, false, false, false, false)`,
    [companyId]
  )
  await db.end()
}

export async function markEmailSent(companyId: string, day: 'd1' | 'd3' | 'd5' | 'd7' | 'nps'): Promise<void> {
  const db = getPool()
  const field = `email_${day}_sent`
  const sentAtField = `email_${day}_sent_at`
  await db.query(
    `UPDATE email_sequence_status SET ${field} = true, ${sentAtField} = NOW() WHERE company_id = $1`,
    [companyId]
  )
  await db.end()
}

export async function getCompaniesForSequence(day: 'd1' | 'd3' | 'd5' | 'd7'): Promise<string[]> {
  const db = getPool()
  
  const dayField = `email_${day}_sent`
  const daySentField = `email_${day}_sent_at`
  
  // Get companies where this day's email hasn't been sent yet and created X days ago
  const daysMap: Record<string, number> = { d1: 1, d3: 3, d5: 5, d7: 7 }
  const days = daysMap[day]
  
  const result = await db.query(
    `SELECT es.company_id 
     FROM email_sequence_status es
     JOIN companies c ON c.id = es.company_id
     WHERE es.${dayField} = false
     AND c.created_at <= NOW() - INTERVAL '${days - 1} days'
     AND c.created_at > NOW() - INTERVAL '${days} days'`,
    []
  )
  
  await db.end()
  return result.rows.map(r => r.company_id)
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    console.log('RESEND_API_KEY not configured')
    return false
  }
  
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendKey}`
      },
      body: JSON.stringify({
        from: 'MyCompi <onboarding@resend.dev>',
        to: [to],
        subject,
        html
      })
    })
    
    return response.ok
  } catch (e) {
    console.error('Email send error:', e)
    return false
  }
}
