// MyCompi Authentication - Register
// Uses db-proxy for database (avoids ctx issues)

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

  if (password.length < 6) {
    return new Response(JSON.stringify({ error: 'Password too short' }), { status: 400, headers });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return new Response(JSON.stringify({ error: 'Email inválido' }), { status: 400, headers });
  }

  try {
    const emailLower = email.toLowerCase();
    const companyId = globalThis.crypto.randomUUID();
    const userId = globalThis.crypto.randomUUID();

    // Hash password
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(password + 'MYCOMPI_SALT_2026');
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Create session token
    const tokenBuffer = globalThis.crypto.getRandomValues(new Uint8Array(32));
    const token = Array.from(tokenBuffer).map(b => b.toString(16).padStart(2, '0')).join('') + '_' + userId;

    // Step 1: Check if email exists
    const checkRes = await fetch('https://guuimyx3.functions.insforge.app/db-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sql: "SELECT id FROM app_user WHERE email = $1",
        params: [emailLower]
      })
    });
    const checkData = await checkRes.json();
    if (checkData.rows && checkData.rows.length > 0) {
      return new Response(JSON.stringify({ error: 'Email exists' }), { status: 409, headers });
    }

    // Step 2: Create company
    await fetch('https://guuimyx3.functions.insforge.app/db-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sql: "INSERT INTO companies (id, name, email, plan, trial_expires_at) VALUES ($1, $2, $3, $4, $5)",
        params: [companyId, company, emailLower, 'trial', new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()]
      })
    });

    // Step 3: Create user
    await fetch('https://guuimyx3.functions.insforge.app/db-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sql: "INSERT INTO app_user (id, name, email, company_id, password_hash) VALUES ($1, $2, $3, $4, $5)",
        params: [userId, name, emailLower, companyId, passwordHash]
      })
    });

    // Step 4: Create session
    await fetch('https://guuimyx3.functions.insforge.app/db-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sql: "INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)",
        params: [token, userId, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()]
      })
    });

    return new Response(
      JSON.stringify({ success: true, userId, companyId, token }),
      { status: 200, headers }
    );

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
