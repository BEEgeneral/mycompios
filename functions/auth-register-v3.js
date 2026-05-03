// Auth Register - Uses ctx.database() properly
// Fixed version of auth-register

export default async function handler(req, ctx) {
  const headers = { 
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  }

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
    return new Response(JSON.stringify({ error: 'Faltan campos requeridos', code: 'MISSING_FIELDS' }), { status: 400, headers })
  }

  if (password.length < 6) {
    return new Response(JSON.stringify({ error: 'Password too short', code: 'WEAK_PASSWORD' }), { status: 400, headers })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return new Response(JSON.stringify({ error: 'Email inválido' }), { status: 400, headers })
  }

  try {
    // ctx should have database() method
    const db = await ctx.database()
    const now = new Date().toISOString()
    const emailLower = email.toLowerCase()

    // Check if email exists
    const { data: existing } = await db
      .from('app_user')
      .select('id')
      .eq('email', emailLower)
      .single()

    if (existing) {
      return new Response(JSON.stringify({ error: 'Ya existe una cuenta con este email', code: 'EMAIL_EXISTS' }), { status: 409, headers })
    }

    // Create company with trial (3 days)
    const companyId = globalThis.crypto.randomUUID()
    const apiKey = 'mc_' + globalThis.crypto.randomUUID().replace(/-/g, '').substring(0, 24)
    const trialExpiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()

    const { error: compError } = await db
      .from('companies')
      .insert({
        id: companyId,
        name: company,
        email: emailLower,
        plan: 'trial',
        trial_expires_at: trialExpiresAt,
        api_key: apiKey,
        created_at: now
      })

    if (compError) {
      return new Response(JSON.stringify({ error: 'Error creating company', detail: compError.message }), { status: 500, headers })
    }

    // Hash password (simple SHA-256 for now)
    const encoder = new TextEncoder()
    const data = encoder.encode(password + 'MYCOMPI_SALT_2026')
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // Create user with company_id (UUID FK)
    const userId = globalThis.crypto.randomUUID()
    const { error: userError } = await db
      .from('app_user')
      .insert({
        id: userId,
        name,
        email: emailLower,
        company_id: companyId,  // UUID, not text
        password_hash: passwordHash,
        created_at: now
      })

    if (userError) {
      return new Response(JSON.stringify({ error: 'Error al crear la cuenta', detail: userError.message }), { status: 500, headers })
    }

    // Create session
    const tokenBuffer = globalThis.crypto.getRandomValues(new Uint8Array(32))
    const token = Array.from(tokenBuffer).map(b => b.toString(16).padStart(2, '0')).join('') + '_' + userId

    await db
      .from('sessions')
      .insert({
        id: token,
        user_id: userId,
        created_at: now,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        companyId,
        token,
        trial_expires_at: trialExpiresAt,
        user: { id: userId, name, email: emailLower }
      }),
      { status: 200, headers }
    )

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers })
  }
}