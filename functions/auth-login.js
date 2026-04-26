// MyCompi Authentication - Login
// Fixed: uses globalThis.crypto instead of CommonJS require

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
    return new Response(JSON.stringify({ error: 'Método no permitido' }), { status: 405, headers });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers });
  }

  const { email, password } = body;

  if (!email || !password) {
    return new Response(
      JSON.stringify({ error: 'Email y contraseña son requeridos', code: 'MISSING_CREDENTIALS' }),
      { status: 400, headers }
    );
  }

  try {
    const supabase = ctx.supabase || await ctx.database();

    const { data: user, error } = await supabase
      .from('app_user')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      return new Response(
        JSON.stringify({ error: 'Credenciales inválidas', code: 'INVALID_CREDENTIALS' }),
        { status: 401, headers }
      );
    }

    // Hash password check using globalThis.crypto
    const salt = 'MYCOMPI_SALT_2026';
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(password + salt);
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (user.password_hash !== passwordHash) {
      return new Response(
        JSON.stringify({ error: 'Credenciales inválidas', code: 'INVALID_CREDENTIALS' }),
        { status: 401, headers }
      );
    }

    // Generate session token
    const tokenBuffer = globalThis.crypto.getRandomValues(new Uint8Array(32));
    const token = Array.from(tokenBuffer).map(b => b.toString(16).padStart(2, '0')).join('') + '_' + user.id;
    const sessionDuration = 30 * 24 * 60 * 60 * 1000;
    const now = new Date().toISOString();

    // Store session
    try {
      await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          token,
          created_at: now,
          expires_at: new Date(Date.now() + sessionDuration).toISOString()
        });
    } catch (e) {
      console.log('Session insert warning:', e.message);
    }

    // Get trial status from company
    let trialInfo = { has_trial: true, trial_expires_at: null };
    try {
      const { data: company } = await supabase
        .from('companies')
        .select('plan, trial_expires_at')
        .eq('email', email.toLowerCase())
        .single();
      if (company) {
        trialInfo = {
          has_trial: company.plan === 'trial',
          trial_expires_at: company.trial_expires_at
        };
      }
    } catch (e) {
      console.log('Trial info lookup warning:', e.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          company: user.company
        },
        trial_expires_at: trialInfo.trial_expires_at,
        has_trial: trialInfo.has_trial
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
    console.error('Login error:', err);
    return new Response(
      JSON.stringify({ error: 'Error al iniciar sesión', code: 'INTERNAL_ERROR' }),
      { status: 500, headers }
    );
  }
}