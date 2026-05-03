// REGISTRATION TEST - super minimal

const DB_PROXY = 'https://guuimyx3.functions.insforge.app/db-proxy'

export default async function handler(req) {
  const headers = { 'Content-Type': 'application/json' }
  
  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'bad json' }, { status: 400 })
  }

  const { email, password, name, company } = body
  if (!email || !password || !name || !company) {
    return Response.json({ error: 'missing' }, { status: 400 })
  }

  const id1 = crypto.randomUUID()
  const id2 = crypto.randomUUID()

  // Insert company
  const r1 = await fetch(DB_PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'companies',
      action: 'insert',
      data: { id: id1, name: company, email: email.toLowerCase(), plan: 'trial' }
    })
  })
  const d1 = await r1.json()

  if (!d1.success) {
    return Response.json({ error: 'company failed', detail: d1.error }, { status: 500 })
  }

  // Insert user
  const r2 = await fetch(DB_PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'app_user',
      action: 'insert',
      data: { id: id2, name, email: email.toLowerCase(), company_id: id1 }
    })
  })
  const d2 = await r2.json()

  if (!d2.success) {
    return Response.json({ error: 'user failed', detail: d2.error }, { status: 500 })
  }

  return Response.json({ success: true, companyId: id1, userId: id2 })
}