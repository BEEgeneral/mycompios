// MyCompi Authentication - Register
// Migrated from InsForge (Deno) to Vercel (Node.js)

import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { query } from '../_lib/db'

const RESEND_API_KEY = 're_TRtcXVky_54TGjwu7juDeY9cbQFCW2Ahj'

export async function POST(req: Request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  }

  if (req.method === 'OPTIONS') {
    return new NextResponse('', { status: 200, headers })
  }

  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'POST only' }, { status: 405, headers })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers })
  }

  const { email, password, name, company, sector, vision } = body

  if (!email || !password || !name || !company) {
    return NextResponse.json(
      { error: 'Faltan campos requeridos', code: 'MISSING_FIELDS' },
      { status: 400, headers }
    )
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: 'La contraseña debe tener al menos 6 caracteres', code: 'WEAK_PASSWORD' },
      { status: 400, headers }
    )
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return NextResponse.json(
      { error: 'Email inválido', code: 'INVALID_EMAIL' },
      { status: 400, headers }
    )
  }

  try {
    const now = new Date().toISOString()

    // Check if email already exists
    const existing = await query(
      'SELECT id FROM app_user WHERE LOWER(email) = LOWER($1)',
      [email]
    )

    if (existing.length > 0) {
      return NextResponse.json(
        {
          error: 'Ya existe una cuenta con este email',
          code: 'EMAIL_EXISTS'
        },
        { status: 409, headers }
      )
    }

    // Create company with trial (3 days)
    const trialExpiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    const companyId = crypto.randomUUID()
    const apiKey = 'mc_' + crypto.randomUUID().replace(/-/g, '').substring(0, 24)

    try {
      await query(
        `INSERT INTO companies (id, name, email, plan, trial_expires_at, api_key, created_at, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [companyId, company, email.toLowerCase(), 'trial', trialExpiresAt, apiKey, now, JSON.stringify({ sector: sector || 'general', vision: vision || '' })]
      )
    } catch (e) {
      console.log('Company insert warning:', e.message)
    }

    // Hash password using Node.js crypto
    const salt = 'MYCOMPI_SALT_2026'
    const passwordHash = crypto.createHash('sha256').update(password + salt).digest('hex')

    // Create user
    const userId = crypto.randomUUID()
    const userResult = await query(
      `INSERT INTO app_user (id, name, email, company, password_hash, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email`,
      [userId, name, email.toLowerCase(), company, passwordHash, now]
    )

    if (userResult.length === 0) {
      return NextResponse.json(
        { error: 'Error al crear la cuenta', code: 'DB_ERROR' },
        { status: 500, headers }
      )
    }

    const userData = userResult[0]

    // Generate session token
    const tokenBuffer = crypto.randomBytes(32)
    const token = tokenBuffer.toString('hex') + '_' + userData.id
    const sessionDuration = 30 * 24 * 60 * 60 * 1000

    // Store session
    try {
      await query(
        `INSERT INTO sessions (user_id, token, created_at, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [userData.id, token, now, new Date(Date.now() + sessionDuration).toISOString()]
      )
    } catch (e) {
      console.log('Session insert warning:', e.message)
    }

    // Initialize agents via autonomous endpoint
    let agentsInitialized = false
    try {
      const autonomousRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://guuimyx3.insforge.site'}/api/autonomous`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'init',
          companyId: companyId,
          config: {
            companyName: company,
            sector: sector || 'general',
            vision: vision || '',
            timezone: 'Europe/Madrid',
            onboardingComplete: true,
            userId: userData.id,
          }
        })
      })
      const autonomousData = await autonomousRes.json()
      agentsInitialized = !autonomousData.error
      console.log('[AUTH-REGISTER] Agents init:', agentsInitialized)
    } catch (e) {
      console.log('[AUTH-REGISTER] Agent init error:', e.message)
    }

    // Send welcome email via Resend
    let emailSent = false
    try {
      const welcomeHtml = buildWelcomeEmail(company, sector, vision)
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: 'MyCompi <onboarding@mycompi.com>',
          to: [email],
          subject: `¡${company}, tu equipo de Compis está listo! 🎉`,
          html: welcomeHtml
        })
      })
      emailSent = true
    } catch (e) {
      console.log('[AUTH-REGISTER] Email error:', e.message)
    }

    // Initialize client tasks
    let tasksInitialized = false
    try {
      const tasksRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://guuimyx3.insforge.site'}/api/client-task-init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId })
      })
      const tasksData = await tasksRes.json()
      tasksInitialized = tasksData.success
      console.log('[AUTH-REGISTER] Tasks init:', tasksInitialized, 'count:', tasksData.tasks_initialized)
    } catch (e) {
      console.log('[AUTH-REGISTER] Tasks init error:', e.message)
    }

    const response = NextResponse.json(
      {
        success: true,
        userId: userData.id,
        companyId: companyId,
        token,
        trial_expires_at: trialExpiresAt,
        agentsInitialized,
        tasksInitialized,
        emailSent,
        user: { id: userData.id, name: userData.name, email: userData.email }
      },
      { status: 200, headers }
    )

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      path: '/',
      maxAge: sessionDuration,
      sameSite: 'strict'
    })

    return response

  } catch (err) {
    console.error('Registration error:', err)
    return NextResponse.json(
      { error: 'Error interno', code: 'INTERNAL_ERROR' },
      { status: 500, headers }
    )
  }
}

function buildWelcomeEmail(companyName: string, sector?: string, vision?: string) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenido a MyCompi</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Poppins',Segoe UI,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    <div style="background:#2D3261;padding:32px 40px;">
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:48px;height:48px;background:#FFD154;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;">🚀</div>
        <div>
          <div style="color:#FFD154;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Registro completo</div>
          <div style="color:#ffffff;font-size:22px;font-weight:700;">¡Bienvenido/a ${companyName}!</div>
        </div>
      </div>
    </div>
    <div style="padding:36px 40px;">
      <p style="font-size:17px;color:#333;margin-top:0;">Hola ${companyName},</p>
      <p style="font-size:16px;color:#444;line-height:1.7;">Tu equipo de Compis acaba de arrancar. Ya están trabajando en tu negocio mientras lees esto.</p>
      ${vision ? `<div style="margin:24px 0;padding:16px;background:#FCF9F1;border-radius:12px;">
        <p style="font-size:14px;font-weight:700;color:#2D3261;margin:0 0 8px 0;">🎯 Tu objetivo:</p>
        <p style="font-size:14px;color:#555;line-height:1.6;margin:0;">${vision}</p>
      </div>` : ''}
      <div style="margin:24px 0;padding:16px;background:#FCF9F1;border-radius:12px;">
        <p style="font-size:14px;font-weight:700;color:#2D3261;margin:0 0 8px 0;">📋 Tu equipo:</p>
        <ul style="margin:0;padding-left:20px;color:#555;font-size:14px;line-height:1.8;">
          <li><strong>Paco</strong> — Director de equipo</li>
          <li><strong>Laura</strong> — Customer Success</li>
          <li><strong>Enzo</strong> — Marketing</li>
          <li><strong>Carlos</strong> — Ventas</li>
          <li><strong>Elena</strong> — Operaciones</li>
          <li><strong>Diana</strong> — Finanzas</li>
        </ul>
      </div>
      <p style="font-size:14px;color:#666;line-height:1.6;">Tienes 3 días de prueba gratis. Presenta tu visión a Paco desde el dashboard.</p>
      <div style="text-align:center;margin:32px 0 0 0;">
        <a href="https://guuimyx3.insforge.site/dashboard" style="display:inline-block;background:#FFD154;color:#2D3261;font-weight:700;padding:14px 32px;border-radius:9999px;text-decoration:none;font-size:15px;">Ir al dashboard →</a>
      </div>
    </div>
    <div style="background:#f8f8f8;padding:20px 40px;text-align:center;">
      <p style="color:#999;font-size:12px;margin:0;">MyCompi — 49€/mes · Sin permanencia</p>
    </div>
  </div>
</body>
</html>`
}