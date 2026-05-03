// MyCompi - Registration test with globalThis access

export default async function handler(req) {
  const headers = { 
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  }
  
  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers })
  }

  const { email, password, name, company } = body

  if (!email || !password || !name || !company) {
    return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400, headers })
  }

  try {
    // Access database via globalThis
    const db = globalThis.__database || globalThis.supabase
    if (!db) {
      return new Response(JSON.stringify({ error: 'Database not available' }), { status: 500, headers })
    }
    
    const emailLower = email.toLowerCase()

    // Check if email exists
    const { data: existing } = await db
      .from('app_user')
      .select('id')
      .eq('email', emailLower)
      .single()

    if (existing) {
      return new Response(JSON.stringify({ error: 'Email exists' }), { status: 409, headers })
    }

    // Create company
    const companyId = globalThis.crypto.randomUUID()
    const { error: compError } = await db
      .from('companies')
      .insert({
        id: companyId,
        name: company,
        email: emailLower,
        plan: 'trial',
        trial_expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      })

    if (compError) {
      return new Response(JSON.stringify({ error: 'Company failed', detail: compError.message }), { status: 500, headers })
    }

    // Create user with company_id (UUID)
    const userId = globalThis.crypto.randomUUID()
    const { error: userError } = await db
      .from('app_user')
      .insert({
        id: userId,
        name,
        email: emailLower,
        company_id: companyId,
        password_hash: 'temp_hash'
      })

    if (userError) {
      return new Response(JSON.stringify({ error: 'User failed', detail: userError.message }), { status: 500, headers })
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        companyId,
        user: { id: userId, name, email: emailLower }
      }),
      { status: 200, headers }
    )

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers })
  }
}