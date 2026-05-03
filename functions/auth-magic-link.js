// MyCompi - Auth Magic Link Edge Function
// Generates magic link tokens and sends via Resend
// Verifies magic link tokens and creates sessions

const DB_PROXY_URL = 'https://guuimyx3.functions.insforge.app/db-proxy'
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || process.env.RESEND_API_KEY || ''
const FRONTEND_URL = 'https://mycompi.com'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
}

// ── DB helpers ────────────────────────────────────────────────────────────────
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

async function dbUpdate(table, filters, data) {
  const res = await fetch(DB_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table, action: 'update', filters, data })
  })
  if (!res.ok) return { error: await res.text() }
  const result = await res.json()
  return result.success ? result : { error: result.error }
}

// ── Token generation ─────────────────────────────────────────────────────────
function generateToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ── Email HTML template ──────────────────────────────────────────────────────
function buildMagicLinkEmail(token, email) {
  const magicUrl = `${FRONTEND_URL}/verify-magic?token=${token}`
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tu enlace de acceso a MyCompi</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Poppins',Segoe UI,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    <div style="background:#2D3261;padding:32px 40px;">
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:48px;height:48px;background:#FFD154;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;">🚀</div>
        <div>
          <div style="color:#FFD154;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Acceso mágico</div>
          <div style="color:#ffffff;font-size:22px;font-weight:700;">¡Hola de nuevo!</div>
        </div>
      </div>
    </div>
    <div style="padding:36px 40px;">
      <p style="font-size:17px;color:#333;margin-top:0;">Hola,</p>
      <p style="font-size:16px;color:#444;line-height:1.7;">Recibimos una solicitud para acceder a tu cuenta MyCompi desde este email.</p>
      <p style="font-size:14px;color:#888;line-height:1.6;margin-bottom:28px;">Si no fuiste tú, puedes ignorar este email con total tranquilidad.</p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${magicUrl}" style="display:inline-block;background:#FFD154;color:#2D3261;font-weight:700;padding:16px 40px;border-radius:9999px;text-decoration:none;font-size:16px;box-shadow:0 4px 14px rgba(255,208,84,0.4);">Acceder a MyCompi →</a>
      </div>
      <p style="font-size:13px;color:#999;text-align:center;line-height:1.6;">Este enlace expira en <strong>15 minutos</strong> y solo puede usarse una vez.</p>
    </div>
    <div style="background:#f8f8f8;padding:20px 40px;text-align:center;">
      <p style="color:#999;font-size:12px;margin:0;">MyCompi — 49€/mes · Sin permanencia · <a href="${FRONTEND_URL}" style="color:#999;">mycompi.com</a></p>
    </div>
  </div>
</body>
</html>`
}

function buildMagicLinkEmailForNewUser(token, email, companyName) {
  const magicUrl = `${FRONTEND_URL}/verify-magic?token=${token}`
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
          <div style="color:#FFD154;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Registro</div>
          <div style="color:#ffffff;font-size:22px;font-weight:700;">¡Bienvenido/a ${companyName}!</div>
        </div>
      </div>
    </div>
    <div style="padding:36px 40px;">
      <p style="font-size:17px;color:#333;margin-top:0;">Hola ${companyName},</p>
      <p style="font-size:16px;color:#444;line-height:1.7;">Tu cuenta MyCompi está casi lista. Solo falta confirmar tu email.</p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${magicUrl}" style="display:inline-block;background:#FFD154;color:#2D3261;font-weight:700;padding:16px 40px;border-radius:9999px;text-decoration:none;font-size:16px;box-shadow:0 4px 14px rgba(255,208,84,0.4);">Confirmar mi email →</a>
      </div>
      <p style="font-size:13px;color:#999;text-align:center;line-height:1.6;">Este enlace expira en <strong>15 minutos</strong>.</p>
    </div>
    <div style="background:#f8f8f8;padding:20px 40px;text-align:center;">
      <p style="color:#999;font-size:12px;margin:0;">MyCompi — 49€/mes · Sin permanencia · <a href="${FRONTEND_URL}" style="color:#999;">mycompi.com</a></p>
    </div>
  </div>
</body>
</html>`
}

// ── Send magic link email via Resend ─────────────────────────────────────────
async function sendMagicLinkEmail(email, token, isNewUser = false, companyName = '') {
  if (!RESEND_API_KEY) {
    console.error('[AUTH-MAGIC] RESEND_API_KEY not set')
    return false
  }
  const html = isNewUser
    ? buildMagicLinkEmailForNewUser(token, email, companyName)
    : buildMagicLinkEmail(token, email)
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: 'MyCompi <onboarding@mycompi.com>',
      to: [email],
      subject: isNewUser ? `¡${companyName}, confirma tu email en MyCompi!` : 'Tu enlace de acceso a MyCompi 🔑',
      html
    })
  })
  if (!res.ok) {
    const err = await res.text()
    console.error('[AUTH-MAGIC] Resend error:', err)
    return false
  }
  return true
}

// ── Main handler ─────────────────────────────────────────────────────────────
export default async function handler(req, ctx) {
  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers })
  }

  const url = new URL(req.url)
  // GET: Verify magic link token
  if (req.method === 'GET' && url.pathname.endsWith('/auth-magic-link')) {
    const token = url.searchParams.get('token')
    if (!token) {
      return new Response(JSON.stringify({ error: 'Token requerido' }), { status: 400, headers })
    }

    const now = new Date().toISOString()
    const links = await dbSelect('auth_magic_links', {
      token,
      used: false,
      limit: 1
    })

    if (!links || links.length === 0) {
      return new Response(JSON.stringify({ error: 'Enlace inválido o ya usado' }), { status: 401, headers })
    }

    const link = links[0]
    if (new Date(link.expires_at) < new Date(now)) {
      return new Response(JSON.stringify({ error: 'Enlace expirado' }), { status: 401, headers })
    }

    await dbUpdate('auth_magic_links', { id: link.id }, { used: true })

    const users = await dbSelect('app_user', { email: link.email.toLowerCase(), limit: 1 })
    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), { status: 404, headers })
    }

    const user = users[0]

    const sessionToken = crypto.randomUUID().replace(/-/g, '') + '_' + user.id
    const sessionDuration = 30 * 24 * 60 * 60 * 1000

    await dbInsert('sessions', {
      id: sessionToken,
      user_id: user.id,
      created_at: now,
      expires_at: new Date(Date.now() + sessionDuration).toISOString()
    })

    const redirectUrl = `${FRONTEND_URL}/dashboard?session=${Buffer.from(JSON.stringify({
      accessToken: sessionToken,
      user: { id: user.id, email: user.email, name: user.name }
    })).toString('base64')}`

    return new Response(null, {
      status: 302,
      headers: {
        ...headers,
        'Location': redirectUrl
      }
    })
  }

  // POST: Send magic link
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), { status: 405, headers })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), { status: 400, headers })
  }

  const { email, is_registration, company_name } = body
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: 'Email inválido' }), { status: 400, headers })
  }

  const normalizedEmail = email.toLowerCase().trim()
  const now = new Date().toISOString()

  if (!is_registration) {
    const users = await dbSelect('app_user', { email: normalizedEmail, limit: 1 })
    if (!users || users.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Si tu email está registrado, recibirás un enlace'
      }), { status: 200, headers })
    }
  }

  const token = generateToken()
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

  const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || ''
  const ua = req.headers.get('user-agent') || ''

  const insertResult = await dbInsert('auth_magic_links', {
    email: normalizedEmail,
    token,
    expires_at: expiresAt,
    ip_address: ip.split(',')[0].trim(),
    user_agent: ua.substring(0, 500)
  })

  if (insertResult.error) {
    console.error('[AUTH-MAGIC] Insert error:', insertResult.error)
    return new Response(JSON.stringify({ error: 'Error interno. Intenta de nuevo.' }), { status: 500, headers })
  }

  const emailSent = await sendMagicLinkEmail(
    normalizedEmail,
    token,
    is_registration === true,
    company_name || ''
  )

  if (!emailSent) {
    return new Response(JSON.stringify({ error: 'Error enviando email. Intenta de nuevo.' }), { status: 500, headers })
  }

  return new Response(JSON.stringify({
    success: true,
    message: is_registration
      ? 'Revisa tu email para confirmar tu cuenta'
      : 'Si tu email está registrado, recibirás un enlace de acceso'
  }), { status: 200, headers })
}