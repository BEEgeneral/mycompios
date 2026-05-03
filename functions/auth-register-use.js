// MyCompi Authentication - Register
// Uses ctx like auth-login (which works)

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

  const { email, password, name, company } = body;

  if (!email || !password || !name || !company) {
    return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400, headers });
  }

  try {
    const supabase = ctx.supabase || await ctx.database();
    const now = new Date().toISOString();
    const emailLower = email.toLowerCase();

    // Check if email exists
    const { data: existing } = await supabase
      .from('app_user')
      .select('id')
      .eq('email', emailLower)
      .single();

    if (existing) {
      return new Response(JSON.stringify({ error: 'Email exists' }), { status: 409, headers });
    }

    // Create company
    const companyId = globalThis.crypto.randomUUID();
    const { error: compError } = await supabase
      .from('companies')
      .insert({
        id: companyId,
        name: company,
        email: emailLower,
        plan: 'trial',
        trial_expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      });

    if (compError) {
      return new Response(JSON.stringify({ error: 'Company error', detail: compError.message }), { status: 500, headers });
    }

    // Hash password
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(password + 'MYCOMPI_SALT_2026');
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Create user
    const userId = globalThis.crypto.randomUUID();
    const { error: userError } = await supabase
      .from('app_user')
      .insert({
        id: userId,
        name,
        email: emailLower,
        company_id: companyId,
        password_hash: passwordHash
      });

    if (userError) {
      return new Response(JSON.stringify({ error: 'User error', detail: userError.message }), { status: 500, headers });
    }

    // Create session
    const tokenBuffer = globalThis.crypto.getRandomValues(new Uint8Array(32));
    const token = Array.from(tokenBuffer).map(b => b.toString(16).padStart(2, '0')).join('') + '_' + userId;

    await supabase
      .from('sessions')
      .insert({
        id: token,
        user_id: userId,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });

    return new Response(
      JSON.stringify({ success: true, userId, companyId, token }),
      { status: 200, headers }
    );

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
