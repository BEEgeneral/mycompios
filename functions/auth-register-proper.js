// MyCompi Authentication - Register
// Uses ctx.database() to avoid loop detection

export default async function handler(req, ctx) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers });
  }

  const { email, password, name, company, sector, vision } = body;

  if (!email || !password || !name || !company) {
    return new Response(
      JSON.stringify({ error: 'Faltan campos requeridos', code: 'MISSING_FIELDS' }),
      { status: 400, headers }
    );
  }

  if (password.length < 6) {
    return new Response(
      JSON.stringify({ error: 'Password too short' }),
      { status: 400, headers }
    );
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return new Response(
      JSON.stringify({ error: 'Email inválido' }),
      { status: 400, headers }
    );
  }

  try {
    const db = ctx.supabase || await ctx.database();
    const now = new Date().toISOString();
    const emailLower = email.toLowerCase();

    // Check if email exists
    const { data: existing } = await db
      .from('app_user')
      .select('id')
      .eq('email', emailLower)
      .single();

    if (existing) {
      return new Response(
        JSON.stringify({ error: 'Ya existe una cuenta con este email', code: 'EMAIL_EXISTS' }),
        { status: 409, headers }
      );
    }

    // Create company with trial (3 days)
    const companyId = globalThis.crypto.randomUUID();
    const apiKey = 'mc_' + globalThis.crypto.randomUUID().replace(/-/g, '').substring(0, 24);
    const trialExpiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

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
      });

    if (compError) {
      return new Response(
        JSON.stringify({ error: 'Error creating company', detail: compError.message }),
        { status: 500, headers }
      );
    }

    // Hash password
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(password + 'MYCOMPI_SALT_2026');
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Create user with company_id (UUID FK)
    const userId = globalThis.crypto.randomUUID();
    const { error: userError } = await db
      .from('app_user')
      .insert({
        id: userId,
        name,
        email: emailLower,
        company_id: companyId,
        password_hash: passwordHash,
        created_at: now
      });

    if (userError) {
      return new Response(
        JSON.stringify({ error: 'Error al crear la cuenta', detail: userError.message }),
        { status: 500, headers }
      );
    }

    // Generate session token
    const tokenBuffer = globalThis.crypto.getRandomValues(new Uint8Array(32));
    const token = Array.from(tokenBuffer).map(b => b.toString(16).padStart(2, '0')).join('') + '_' + userId;
    const sessionDuration = 30 * 24 * 60 * 60 * 1000;

    // Store session
    await db
      .from('sessions')
      .insert({
        id: token,
        user_id: userId,
        created_at: now,
        expires_at: new Date(Date.now() + sessionDuration).toISOString()
      });

    // Initialize agents
    let agentsInitialized = false;
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
      });
      const autonomousData = await autonomousRes.json();
      agentsInitialized = !autonomousData.error;
    } catch (e) {
      console.log('[AUTH-REGISTER] Agent init error:', e.message);
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
          'Set-Cookie': `auth_token=${token}; HttpOnly; Path=/; Max-Age=${sessionDuration}; SameSite=Strict`
        }
      }
    );

  } catch (err) {
    console.error('Register error:', err);
    return new Response(
      JSON.stringify({ error: 'Error interno', code: 'INTERNAL_ERROR' }),
      { status: 500, headers }
    );
  }
}