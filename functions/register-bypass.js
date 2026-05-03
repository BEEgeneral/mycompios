// MyCompi - Standalone Registration Bypass
// Uses direct SQL via db-proxy to bypass InsForge deploy issue
// This function deploys standalone (not via InsForge project deploy)

const DB_PROXY_URL = 'https://guuimyx3.functions.insforge.app/db-proxy'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
}

async function dbQuery(sql) {
  const res = await fetch(DB_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql })
  })
  if (!res.ok) return { error: await res.text() }
  const data = await res.json()
  return data
}

async function hashPassword(password) {
  const salt = 'MYCOMPI_SALT_2026'
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(password + salt)
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
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
    const nowSQL = "NOW()"
    const emailLower = email.toLowerCase()

    // Check if email exists
    const existingCheck = await dbQuery(
      `SELECT id FROM app_user WHERE email = '${emailLower}' LIMIT 1`
    )
    if (existingCheck.success && existingCheck.rows.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Ya existe una cuenta con este email', code: 'EMAIL_EXISTS' }),
        { status: 409, headers }
      )
    }

    // Generate IDs
    const companyId = crypto.randomUUID()
    const userId = crypto.randomUUID()
    const apiKey = 'mc_' + crypto.randomUUID().replace(/-/g, '').substring(0, 24)
    const passwordHash = await hashPassword(password)
    const trialExpiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()

    // Create company
    const compResult = await dbQuery(
      `INSERT INTO companies (id, name, email, plan, created_at, trial_expires_at, api_key) 
       VALUES ('${companyId}', '${company.replace(/'/g, "''")}', '${emailLower}', 'trial', ${nowSQL}, '${trialExpiresAt}', '${apiKey}') 
       RETURNING id`
    )
    if (!compResult.success) {
      console.error('[REGISTER] Company insert failed:', compResult.error)
      return new Response(
        JSON.stringify({ error: 'Error creando empresa', code: 'COMPANY_ERROR' }),
        { status: 500, headers }
      )
    }

    // Create user with company_id (UUID, NOT text)
    const userResult = await dbQuery(
      `INSERT INTO app_user (id, name, email, password_hash, created_at, company_id) 
       VALUES ('${userId}', '${name.replace(/'/g, "''")}', '${emailLower}', '${passwordHash}', ${nowSQL}, '${companyId}') 
       RETURNING id`
    )
    if (!userResult.success) {
      console.error('[REGISTER] User insert failed:', userResult.error)
      // Rollback company
      await dbQuery(`DELETE FROM companies WHERE id = '${companyId}'`)
      return new Response(
        JSON.stringify({ error: 'Error al crear la cuenta', code: 'DB_ERROR' }),
        { status: 500, headers }
      )
    }

    // Generate session token
    const tokenBuffer = crypto.getRandomValues(new Uint8Array(32))
    const token = Array.from(tokenBuffer).map(b => b.toString(16).padStart(2, '0')).join('') + '_' + userId

    // Store session
    await dbQuery(
      `INSERT INTO sessions (id, user_id, created_at, expires_at) 
       VALUES ('${token}', '${userId}', ${nowSQL}, '${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()}')`
    )

    // Initialize agents via autonomous
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
      console.log('[REGISTER] Agent init error:', e.message)
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId: userId,
        companyId: companyId,
        token,
        trial_expires_at: trialExpiresAt,
        agentsInitialized,
        user: { id: userId, name, email: emailLower }
      }),
      {
        status: 200,
        headers: {
          ...headers,
          'Set-Cookie': `auth_token=${token}; HttpOnly; Path=/; Max-Age=2592000; SameSite=Strict`
        }
      }
    )

  } catch (err) {
    console.error('[REGISTER] Unexpected error:', err)
    return new Response(
      JSON.stringify({ error: 'Error interno', code: 'INTERNAL_ERROR' }),
      { status: 500, headers }
    )
  }
}