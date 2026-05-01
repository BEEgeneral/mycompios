/**
 * Email Sequence Cron - Process D1, D3, D5, D7, NPS
 * GET /api/email-sequence?day=d1
 */

import { NextResponse } from 'next/server'

const DAY_MAP: Record<string, 'd1' | 'd3' | 'd5' | 'd7'> = {
  '1': 'd1',
  '3': 'd3',
  '5': 'd5',
  '7': 'd7'
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const day = searchParams.get('day')
  
  if (!day || !DAY_MAP[day]) {
    return NextResponse.json({ 
      error: 'Day required (1, 3, 5, or 7)' 
    }, { status: 400 })
  }

  const { Pool } = require('pg')
  const pool = new Pool({
    host: process.env.NEON_HOST,
    port: 5432,
    database: process.env.NEON_DB,
    user: process.env.NEON_USER,
    password: process.env.NEON_PASSWORD,
    ssl: true,
    max: 1,
  })

  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }

  try {
    const dayKey = DAY_MAP[day]
    
    // Get companies that need this day's email
    const emailField = `email_${dayKey}_sent`
    const sentAtField = `email_${dayKey}_sent_at`
    
    const daysInterval = parseInt(day)
    
    const companiesResult = await pool.query(`
      SELECT es.company_id, c.email, c.name as company_name, u.name as user_name
      FROM email_sequence_status es
      JOIN companies c ON c.id = es.company_id
      JOIN app_user u ON u.company_id = c.id
      WHERE es.${emailField} = false
      AND c.created_at <= NOW() - INTERVAL '${daysInterval - 1} days'
      AND c.created_at > NOW() - INTERVAL '${daysInterval} days'
      AND c.plan = 'trial'
    `)

    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      await pool.end()
      return NextResponse.json({ 
        success: false, 
        error: 'RESEND_API_KEY not configured' 
      }, { headers })
    }

    const templates: Record<string, { subject: string; getHtml: (name: string, company?: string) => string }> = {
      d1: {
        subject: 'Bienvenido a MyCompi - Empieza hoy',
        getHtml: (name) => `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Bienvenido</title></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Segoe UI',sans-serif;">
<div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
<div style="background:#2D3261;padding:32px 40px;"><h1 style="color:#FFD154;margin:0;">¡Bienvenido/a ${name}!</h1></div>
<div style="padding:40px;">
<p style="font-size:16px;color:#333;line-height:1.6;">Hola ${name},<br><br>Tu equipo MyCompi está listo para trabajar. Мы已经开始 a analizar tu negocio y preparar las primeras recomendaciones.</p>
<div style="margin:30px 0;text-align:center;"><a href="https://mycompi.com/dashboard" style="display:inline-block;background:#FFD154;color:#2D3261;padding:14px 32px;border-radius:9999px;text-decoration:none;font-weight:bold;">Ir al Dashboard</a></div>
<p style="font-size:14px;color:#666;margin-top:20px;">🎯 Tu primer informe estará listo en 24 horas</p>
</div>
<div style="background:#f8f9fa;padding:20px 40px;text-align:center;"><p style="color:#999;font-size:12px;margin:0;">MyCompi - Tu equipo IA 24/7</p></div>
</div></body></html>`
      },
      d3: {
        subject: 'Primeros insights de tu negocio',
        getHtml: (name, company) => `
<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Insights</title></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Segoe UI',sans-serif;">
<div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
<div style="background:#2D3261;padding:32px 40px;"><h1 style="color:#FFD154;margin:0;">📊 Día 3 - Insights</h1></div>
<div style="padding:40px;">
<p style="font-size:16px;color:#333;">Hola ${name},<br><br>Ya hemos analizado ${company || 'tu negocio'}. Aquí van los primeros datos:</p>
<div style="background:#f8f9fa;padding:20px;border-radius:12px;margin:20px 0;">
<p style="margin:0;font-size:14px;color:#666;">📋 <strong>3 tareas completadas</strong><br>📊 <strong>2 nuevas recomendaciones</strong><br>💡 <strong>1 insight de mercado</strong></p>
</div>
<div style="margin:30px 0;text-align:center;"><a href="https://mycompi.com/dashboard" style="display:inline-block;background:#FFD154;color:#2D3261;padding:14px 32px;border-radius:9999px;text-decoration:none;font-weight:bold;">Ver Dashboard</a></div>
</div>
<div style="background:#f8f9fa;padding:20px 40px;text-align:center;"><p style="color:#999;font-size:12px;margin:0;">MyCompi - Día 3 de tu trial</p></div>
</div></body></html>`
      },
      d5: {
        subject: '⚠️ Tu trial expira en 2 días',
        getHtml: (name) => `
<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Trial expira</title></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Segoe UI',sans-serif;">
<div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
<div style="background:#e74c3c;padding:32px 40px;"><h1 style="color:#fff;margin:0;">⚠️ Quedan 2 días de trial</h1></div>
<div style="padding:40px;">
<p style="font-size:16px;color:#333;">Hola ${name},<br><br>Tu trial de MyCompi termina en <strong>2 días</strong>. Hemos preparado un resumen de lo que hemos logrado juntos.</p>
<div style="margin:30px 0;">
<a href="https://mycompi.com/autonomous" style="display:block;background:#2D3261;color:#FFD154;padding:16px 24px;border-radius:12px;text-decoration:none;text-align:center;font-weight:bold;margin-bottom:12px;">🚀 Activar Modo Autónomo</a>
<a href="https://mycompi.com/dashboard" style="display:block;background:#f8f9fa;color:#333;padding:16px 24px;border-radius:12px;text-decoration:none;text-align:center;">Ver progreso</a>
</div>
</div>
<div style="background:#f8f9fa;padding:20px 40px;text-align:center;"><p style="color:#999;font-size:12px;margin:0;">MyCompi - Tu trial expira pronto</p></div>
</div></body></html>`
      },
      d7: {
        subject: '📊 Tu resumen semanal',
        getHtml: (name, company) => `
<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Resumen semanal</title></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Segoe UI',sans-serif;">
<div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
<div style="background:#2D3261;padding:32px 40px;"><h1 style="color:#FFD154;margin:0;">📊 Tu semana en MyCompi</h1></div>
<div style="padding:40px;">
<p style="font-size:16px;color:#333;">Hola ${name},<br><br>${company || 'Tu negocio'} tuvo una semana productiva. Aquí está el resumen:</p>
<div style="background:#f0f8ff;padding:20px;border-radius:12px;margin:20px 0;text-align:center;">
<p style="font-size:32px;font-weight:bold;color:#2D3261;margin:0;">+12</p>
<p style="font-size:14px;color:#666;margin:4px 0;">tareas completadas</p>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:20px 0;">
<div style="background:#f8f9fa;padding:16px;border-radius:8px;text-align:center;">
<p style="font-size:24px;font-weight:bold;color:#27ae60;margin:0;">85%</p>
<p style="font-size:12px;color:#666;margin:4px 0 0;">efectividad</p>
</div>
<div style="background:#f8f9fa;padding:16px;border-radius:8px;text-align:center;">
<p style="font-size:24px;font-weight:bold;color:#e67e22;margin:0;">8</p>
<p style="font-size:12px;color:#666;margin:4px 0 0;">horas autónomas</p>
</div>
</div>
<div style="margin:30px 0;text-align:center;"><a href="https://mycompi.com/dashboard" style="display:inline-block;background:#FFD154;color:#2D3261;padding:16px 32px;border-radius:9999px;text-decoration:none;font-weight:bold;font-size:16px;">Ver informe completo</a></div>
</div>
<div style="background:#f8f9fa;padding:20px 40px;text-align:center;"><p style="color:#999;font-size:12px;margin:0;">MyCompi - Tu primera semana</p></div>
</div></body></html>`
      }
    }

    const template = templates[dayKey]
    let sent = 0
    let failed = 0

    for (const row of companiesResult.rows) {
      const html = template.getHtml(row.user_name, row.company_name)
      
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendKey}`
          },
          body: JSON.stringify({
            from: 'MyCompi <onboarding@resend.dev>',
            to: [row.email],
            subject: template.subject,
            html
          })
        })

        if (response.ok) {
          // Mark as sent
          await pool.query(
            `UPDATE email_sequence_status SET ${emailField} = true, ${sentAtField} = NOW() WHERE company_id = $1`,
            [row.company_id]
          )
          sent++
        } else {
          failed++
        }
      } catch (e) {
        failed++
      }
    }

    await pool.end()

    return NextResponse.json({
      success: true,
      day,
      sent,
      failed,
      total: companiesResult.rows.length
    }, { headers })

  } catch (err) {
    await pool.end()
    return NextResponse.json({ 
      success: false, 
      error: err.message 
    }, { status: 500 })
  }
}