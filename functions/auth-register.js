// MyCompi Authentication - Register v5 (FIXED)
// BUG FIX: company_id must be UUID, not text
// Uses db-proxy (Neon PostgreSQL)

const DB_PROXY_URL = 'https://guuimyx3.functions.insforge.app/db-proxy'
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || process.env.RESEND_API_KEY || ''

const headers = {
  'Access-Control-Allow-Origin': 'https://mycompi.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
}

async function dbSelect(table, filters = {}) {
  const res = await fetch(DB_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table, action: 'select', filters })
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.success ? data.rows : null
}

async function dbInsert(table, data) {
  const res = await fetch(DB_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table, action: 'insert', data })
  })
  if (!res.ok) return { error: await res.text() }
  const result = await res.json()
  return result.success ? result : { error: result.error }
}

async function hashPassword(password) {
  const salt = 'MYCOMPI_SALT_2026'
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(password + salt)
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function buildWelcomeEmail(companyName, sector, vision) {
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
      <div style="text-align:center;margin:32px 0 0 0;">
        <a href="https://mycompi.com/dashboard" style="display:inline-block;background:#FFD154;color:#2D3261;font-weight:700;padding:14px 32px;border-radius:9999px;text-decoration:none;font-size:15px;">Ir al dashboard →</a>
      </div>
    </div>
    <div style="background:#f8f8f8;padding:20px 40px;text-align:center;">
      <p style="color:#999;font-size:12px;margin:0;">MyCompi — 49€/mes · Sin permanencia</p>
    </div>
  </div>
</body>
</html>`
}

export default async function handler(req, ctx) {
  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers })
  }

  const { email, password, name, company, sector, vision } = body

  if (!email || !password || !name || !company) {
    return new Response(
      JSON.stringify({ error: 'Faltan campos requeridos', code: 'MISSING_FIELDS' }),
      { status: 400, headers }
    )
  }

  if (password.length < 6) {
    return new Response(
      JSON.stringify({ error: 'La contraseña debe tener al menos 6 caracteres', code: 'WEAK_PASSWORD' }),
      { status: 400, headers }
    )
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return new Response(
      JSON.stringify({ error: 'Email inválido', code: 'INVALID_EMAIL' }),
      { status: 400, headers }
    )
  }

  try {
    const now = new Date().toISOString()

    // Check if email already exists
    const existing = await dbSelect('app_user', { email: email.toLowerCase(), limit: 1 })
    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Ya existe una cuenta con este email', code: 'EMAIL_EXISTS' }),
        { status: 409, headers }
      )
    }

    // Create company with trial (3 days)
    const trialExpiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    const companyId = crypto.randomUUID()
    const apiKey = 'mc_' + crypto.randomUUID().replace(/-/g, '').substring(0, 24)

    let companyCreated = false
    try {
      const compResult = await dbInsert('companies', {
        id: companyId,
        name: company,
        email: email.toLowerCase(),
        plan: 'trial',
        trial_expires_at: trialExpiresAt,
        api_key: apiKey,
        created_at: now
      })
      companyCreated = !compResult.error
      if (!companyCreated) {
        console.error('[AUTH-REGISTER] Company insert failed:', compResult.error)
      }
    } catch (e) {
      console.error('[AUTH-REGISTER] Company insert error:', e.message)
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create user with company_id (UUID FK to companies.id)
    const userId = crypto.randomUUID()
    const userResult = await dbInsert('app_user', {
      id: userId,
      name,
      email: email.toLowerCase(),
      company_id: companyId,  // FIXED: was 'company' (text) - must be UUID
      password_hash: passwordHash,
      created_at: now
    })

    if (userResult.error) {
      console.error('[AUTH-REGISTER] User creation error:', userResult.error)
      return new Response(
        JSON.stringify({ error: 'Error al crear la cuenta', code: 'DB_ERROR' }),
        { status: 500, headers }
      )
    }

    // Generate session token
    const tokenBuffer = crypto.getRandomValues(new Uint8Array(32))
    const token = Array.from(tokenBuffer).map(b => b.toString(16).padStart(2, '0')).join('') + '_' + userId
    const sessionDuration = 30 * 24 * 60 * 60 * 1000

    // Store session
    try {
      await dbInsert('sessions', {
        id: token,
        user_id: userId,
        created_at: now,
        expires_at: new Date(Date.now() + sessionDuration).toISOString()
      })
    } catch (e) {
      console.log('[AUTH-REGISTER] Session insert warning:', e.message)
    }

    // Initialize agents
    let agentsInitialized = false
    try {
      const autonomousRes = await fetch('https://guuimyx3.functions.insforge.app/autonomous', {
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
            userId: userId
          }
        })
      })
      const autonomousData = await autonomousRes.json()
      agentsInitialized = !autonomousData.error
    } catch (e) {
      console.log('[AUTH-REGISTER] Agent init error:', e.message)
    }

    // Send welcome email
    if (RESEND_API_KEY) {
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
      } catch (e) {
        console.log('[AUTH-REGISTER] Email error:', e.message)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId: userId,
        companyId: companyId,
        token,
        trial_expires_at: trialExpiresAt,
        agentsInitialized,
        user: { id: userId, name, email: email.toLowerCase() }
      }),
      {
        status: 200,
        headers: {
          ...headers,
          'Set-Cookie': `auth_token=${token}; HttpOnly; Path=/; Max-Age=${sessionDuration}; SameSite=Strict`
        }
      }
    )

  } catch (err) {
    console.error('[AUTH-REGISTER] Registration error:', err)
    return new Response(
      JSON.stringify({ error: 'Error interno', code: 'INTERNAL_ERROR' }),
      { status: 500, headers }
    )
  }
}