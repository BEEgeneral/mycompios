// MyCompi Authentication - Register

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
    const db = ctx.supabase || await ctx.database();
    const now = new Date().toISOString();
    const emailLower = email.toLowerCase();

    // Check existing
    const { data: exists } = await db
      .from('app_user')
      .select('id')
      .eq('email', emailLower)
      .single();

    if (exists) {
      return new Response(JSON.stringify({ error: 'Email exists' }), { status: 409, headers });
    }

    // Create company
    const companyId = globalThis.crypto.randomUUID();
    const { error: compErr } = await db
      .from('companies')
      .insert({
        id: companyId,
        name: company,
        email: emailLower,
        plan: 'trial',
        trial_expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      });

    if (compErr) {
      return new Response(JSON.stringify({ error: 'Company error' }), { status: 500, headers });
    }

    // Hash password
    const enc = new TextEncoder();
    const buf = await crypto.subtle.digest('SHA-256', enc.encode(password + 'MYCOMPI_SALT_2026'));
    const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');

    // Create user
    const userId = globalThis.crypto.randomUUID();
    const { error: userErr } = await db
      .from('app_user')
      .insert({
        id: userId,
        name: name,
        email: emailLower,
        company_id: companyId,
        password_hash: hash
      });

    if (userErr) {
      return new Response(JSON.stringify({ error: 'User error' }), { status: 500, headers });
    }

    // Create session
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join('') + '_' + userId;

    await db
      .from('sessions')
      .insert({
        id: token,
        user_id: userId,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });

    return new Response(
      JSON.stringify({ success: true, userId, companyId, token, email: emailLower }),
      { status: 200, headers }
    );

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}