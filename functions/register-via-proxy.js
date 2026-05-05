// Test: Call db-proxy from INSIDE this function via HTTP
// If this works, it proves we can bypass ctx issue

export default async function handler(req, ctx) {
  const headers = { 'Content-Type': 'application/json' };

  try {
    // Test calling db-proxy from INSIDE this function
    const r = await fetch('https://guuimyx3.functions.insforge.app/db-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: "SELECT 'internal-call-works' as result" })
    });
    const data = await r.json();

    return new Response(JSON.stringify({
      success: true,
      test: data,
      ctxAvailable: !!ctx.supabase,
      ctxDatabaseAvailable: !!ctx.database
    }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
}
