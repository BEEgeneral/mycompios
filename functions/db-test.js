// DB-TEST function - just tests db-proxy

export default async function handler(req) {
  const headers = { 'Content-Type': 'application/json' }
  
  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers })
  }

  // Just test db-proxy
  const res = await fetch('https://guuimyx3.functions.insforge.app/db-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql: 'SELECT 1 as num' })
  })
  
  const text = await res.text()
  
  return Response.json({ 
    ok: res.ok, 
    status: res.status,
    body: text.substring(0, 100)
  })
}