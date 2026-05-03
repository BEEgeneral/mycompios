// Test function to verify db-proxy approach works

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

  try {
    // Test 1: Check db-proxy
    const dbRes = await fetch('https://guuimyx3.functions.insforge.app/db-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sql: "SELECT 'db-proxy-works' as result"
      })
    });
    const dbData = await dbRes.json();

    // Test 2: Insert test company via db-proxy
    const testId = '60000000-0000-0000-0000-000000000000';
    const insertRes = await fetch('https://guuimyx3.functions.insforge.app/db-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sql: "INSERT INTO companies (id, name, email, plan, trial_expires_at) VALUES ($1, $2, $3, $4, $5) RETURNING id",
        params: [testId, 'DB Proxy Test', 'dbproxy@test.com', 'trial', '2026-05-10']
      })
    });
    const insertData = await insertRes.json();

    return new Response(JSON.stringify({
      success: true,
      dbTest: dbData,
      insertTest: insertData,
      message: 'This function uses db-proxy via HTTP, no ctx needed!'
    }), { status: 200, headers });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
