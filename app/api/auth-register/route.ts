// AUTH REGISTER - Register new user and companyId

import { NextResponse } from 'next/server'
import { checkEmailExists, createCompany, createNewUser, createRegistrationSession, initializeTrialStatus, initializeEmailSequence } from '../../lib/services/register-service'

// Rate limiting
const ipLimits = new Map()
const RATE_MAX = 5
const RATE_WINDOW = 3600000

function checkRateLimit(ip: string): number {
  const now = Date.now()
  const record = ipLimits.get(ip) || { count: 0, resetAt: now + RATE_WINDOW }
  if (now > record.resetAt) {
    record.count = 0
    record.resetAt = now + RATE_WINDOW
  }
  record.count++
  ipLimits.set(ip, record)
  if (record.count > RATE_MAX) {
    return Math.ceil((record.resetAt - now) / 1000)
  }
  return 0
}

export async function POST(req: Request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  }

  if (req.method === 'OPTIONS') {
    return new NextResponse('', { status: 200, headers })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const retryAfter = checkRateLimit(ip)
  if (retryAfter > 0) {
    return NextResponse.json(
      { error: 'Demasiados registros', code: 'RATE_LIMITED', retryAfter },
      { status: 429, headers }
    )
  }

  try {
    const { email, password, name, company, sector, vision, website } = await req.json()

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

    // Check if email exists
    if (await checkEmailExists(email)) {
      return NextResponse.json(
        { error: 'Ya existe una cuenta con este email', code: 'EMAIL_EXISTS' },
        { status: 409, headers }
      )
    }

    // Create companyId
    const { companyId, trialExpiresAt } = await createCompany({
      name: company,
      email,
      sector,
      vision,
      website
    })

    // Create user
    const userData = await createNewUser({
      name,
      email,
      password,
      companyId
    })

    // Create session
    const token = await createRegistrationSession(userData.userId)

    // Initialize trial and email sequence
    await initializeTrialStatus(companyId, trialExpiresAt)
    await initializeEmailSequence(companyId)

    // Send welcome email (async)
    sendWelcomeEmail(email, company, name).catch(e => console.log('Email error:', e.message))

    const response = NextResponse.json({
      success: true,
      userId: userData.userId,
      companyId,
      token,
      trial_expires_at: trialExpiresAt,
      onboarding_step: 1,
      user: { id: userData.userId, name: userData.name, email: userData.email }
    }, { status: 200, headers })

    response.cookies.set('mc_token', token, {
      httpOnly: true,
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
      sameSite: 'lax'
    })

    return response

  } catch (err) {
    console.error('Register error:', err)
    return NextResponse.json(
      { error: 'Error interno', code: 'INTERNAL_ERROR', detail: err.message },
      { status: 500, headers }
    )
  }
}

async function sendWelcomeEmail(email: string, companyName: string, nombre: string) {
  try {
    const html = buildWelcomeEmail(nombre, companyName)
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'MyCompi <onboarding@resend.dev>',
        to: [email],
        subject: `Bienvenido a MyCompi, ${nombre}!`,
        html
      })
    })
  } catch (e) {
    console.log('Email send error:', e.message)
  }
}

function buildWelcomeEmail(nombre: string, companyName: string) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Bienvenido a MyCompi</title></head><body style="margin:0;padding:0;background:#f4f4f4;font-family:'Poppins',Segoe UI,sans-serif;"><div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);"><div style="background:#2D3261;padding:32px 40px;"><div style="color:#FFD154;font-size:22px;font-weight:700;">Bienvenido/a ${nombre}!</div></div><div style="padding:36px 40px;"><p style="font-size:17px;color:#333;">Hola ${nombre},</p><p style="font-size:16px;color:#444;line-height:1.7;">Tu equipo de Compis esta listo. Tienes 3 dias de prueba gratis.</p><div style="text-align:center;margin:32px 0 0 0;"><a href="https://mycompios.vercel.app/dashboard" style="display:inline-block;background:#FFD054;color:#2D3261;font-weight:700;padding:14px 32px;border-radius:9999px;text-decoration:none;font-size:15px;">Ir al dashboard</a></div></div><div style="background:#f8f8f8;padding:20px 40px;text-align:center;"><p style="color:#999;font-size:12px;margin:0;">MyCompi - 49€/mes - Sin permanencia</p></div></div></body></html>`
}