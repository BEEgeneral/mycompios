// Simple test - just call db-proxy and return result
export default async function handler(req, ctx) {
  const headers = { 'Content-Type': 'application/json' };
  try {
    const r = await fetch('https://guuimyx3.functions.insforge.app/db-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: "SELECT 'proxy-call-test' as result" })
    });
    const data = await r.json();
    return new Response(JSON.stringify({ success: true, proxyResult: data }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
}
