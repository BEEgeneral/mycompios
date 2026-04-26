// BUSINESS CORE v3 - OpenViking persistent storage
// Fixed array handling for vikingSearch results

const OPENVIKING_URL = 'https://openviking-jggo.srv1583696.hstgr.cloud'
const OPENVIKING_KEY = 'BnjbkRgOIn4MBywXDLaI6S0R43bnxQIO'

async function vikingStore(entityType, companyId, data) {
  try {
    const sessionRes = await fetch(OPENVIKING_URL + '/api/v1/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': OPENVIKING_KEY },
      body: JSON.stringify({ metadata: { entityType, companyId } })
    })
    const sessionData = await sessionRes.json()
    const sessionId = sessionData?.result?.session_id
    if (!sessionId) return { error: 'No session' }
    
    const content = JSON.stringify({ entityType, companyId, data, timestamp: new Date().toISOString() })
    await fetch(OPENVIKING_URL + '/api/v1/sessions/' + sessionId + '/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': OPENVIKING_KEY },
      body: JSON.stringify({ role: 'user', content })
    })
    await fetch(OPENVIKING_URL + '/api/v1/sessions/' + sessionId + '/commit', {
      method: 'POST',
      headers: { 'X-API-Key': OPENVIKING_KEY }
    })
    return { success: true, sessionId }
  } catch (e) {
    return { error: e.message }
  }
}

async function vikingSearch(entityType, companyId, limit = 20) {
  try {
    const res = await fetch(OPENVIKING_URL + '/api/v1/search/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': OPENVIKING_KEY },
      body: JSON.stringify({ query: `${entityType} company:${companyId}`, limit })
    })
    const data = await res.json()
    return data.result || []
  } catch (e) {
    return []
  }
}

function scoreLead(source, interestLevel) {
  let score = 30
  if (source === 'referral') score += 30
  else if (source === 'inbound') score += 20
  else if (source === 'web') score += 10
  if (interestLevel === 'urgent') score += 25
  else if (interestLevel === 'high') score += 15
  else if (interestLevel === 'medium') score += 5
  return Math.min(score, 100)
}

function safeFilter(arr, fn) {
  if (!Array.isArray(arr)) return []
  return arr.filter(fn)
}

export default async function handler(req, ctx) {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers })

  try {
    let body = {}
    try { body = await req.json() } catch { /* empty */ }
    const { action, company_id, data } = body

    if (!company_id) return new Response(JSON.stringify({ error: 'company_id required' }), { status: 400, headers })

    // GET: dashboard
    if (req.method === 'GET') {
      const [leads, invoices, clients, opportunities] = await Promise.all([
        vikingSearch('lead', company_id, 10),
        vikingSearch('invoice', company_id, 10),
        vikingSearch('client', company_id, 10),
        vikingSearch('opportunity', company_id, 10),
      ])

      const paidInv = safeFilter(invoices, i => i.context?.status === 'paid')
      const mrr = paidInv.reduce((s, i) => s + (i.context?.total || 0), 0)
      const openOpps = safeFilter(opportunities, o => o.context?.stage !== 'won' && o.context?.stage !== 'lost')
      const pipelineValue = openOpps.reduce((s, o) => s + (o.context?.value || 0), 0)

      return new Response(JSON.stringify({
        success: true,
        dashboard: {
          mrr: Math.round(mrr * 100) / 100,
          pipelineValue: Math.round(pipelineValue * 100) / 100,
          overdueInvoices: safeFilter(invoices, i => i.context?.status === 'overdue').length,
          activeLeads: safeFilter(leads, l => l.context?.status !== 'converted').length,
          activeClients: safeFilter(clients, c => c.context?.status === 'active').length,
        }
      }), { headers })
    }

    switch (action) {
      case 'create_lead': {
        const { name, email, source, interest_level } = data
        const score = scoreLead(source, interest_level)
        const agent = score >= 70 ? 'pelayo' : 'paco'
        const r = await vikingStore('lead', company_id, { name, email, source, interest_level, score, status: 'new', agent })
        return new Response(JSON.stringify({ success: !r.error, agent, score, sessionId: r.sessionId }), { headers })
      }

      case 'create_invoice': {
        const { client_name, items, tax_rate, due_days } = data
        const subtotal = items.reduce((s, i) => s + (i.quantity * i.unit_price), 0)
        const tax = subtotal * ((tax_rate || 21) / 100)
        const total = subtotal + tax
        const invoiceNumber = 'INV-' + Date.now().toString().slice(-8)
        const dueDate = new Date(Date.now() + (due_days || 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        const r = await vikingStore('invoice', company_id, { invoiceNumber, client_name, items, subtotal: Math.round(subtotal * 100) / 100, tax: Math.round(tax * 100) / 100, total: Math.round(total * 100) / 100, dueDate, status: 'draft' })
        return new Response(JSON.stringify({ success: !r.error, invoiceNumber, total: Math.round(total * 100) / 100, dueDate }), { headers })
      }

      case 'create_client': {
        const { name, email, company_name, sector } = data
        const r = await vikingStore('client', company_id, { name, email, company_name, sector, status: 'active' })
        return new Response(JSON.stringify({ success: !r.error }), { headers })
      }

      case 'create_opportunity': {
        const { title, value, stage, client_name } = data
        const r = await vikingStore('opportunity', company_id, { title, value, stage: stage || 'discovery', probability: 20, client_name })
        return new Response(JSON.stringify({ success: !r.error, title, value, stage }), { headers })
      }

      case 'record_payment': {
        const { invoice_number, amount, method } = data
        const r = await vikingStore('payment', company_id, { invoice_number, amount, method: method || 'transfer', status: 'completed' })
        await vikingStore('invoice', company_id, { invoice_number, status: 'paid', paidAmount: amount })
        return new Response(JSON.stringify({ success: !r.error, amount, status: 'paid' }), { headers })
      }

      case 'get_leads': {
        const leads = await vikingSearch('lead', company_id, 50)
        return new Response(JSON.stringify({ success: true, leads: safeFilter(leads, l => l.context?.status !== 'converted') }), { headers })
      }

      case 'get_invoices': {
        const invoices = await vikingSearch('invoice', company_id, 50)
        return new Response(JSON.stringify({ success: true, invoices }), { headers })
      }

      case 'get_metrics': {
        const [leads, invoices, clients, opportunities] = await Promise.all([
          vikingSearch('lead', company_id, 100),
          vikingSearch('invoice', company_id, 100),
          vikingSearch('client', company_id, 100),
          vikingSearch('opportunity', company_id, 100),
        ])
        const paidInv = safeFilter(invoices, i => i.context?.status === 'paid')
        const mrr = paidInv.reduce((s, i) => s + (i.context?.total || 0), 0)
        const openOpps = safeFilter(opportunities, o => o.context?.stage !== 'won' && o.context?.stage !== 'lost')
        return new Response(JSON.stringify({
          success: true,
          metrics: {
            mrr: Math.round(mrr * 100) / 100,
            arr: Math.round(mrr * 12 * 100) / 100,
            pipelineValue: Math.round(openOpps.reduce((s, o) => s + (o.context?.value || 0), 0) * 100) / 100,
            overdueInvoices: safeFilter(invoices, i => i.context?.status === 'overdue').length,
            activeLeads: safeFilter(leads, l => l.context?.status !== 'converted').length,
            activeClients: safeFilter(clients, c => c.context?.status === 'active').length,
            wonOpportunities: safeFilter(opportunities, o => o.context?.stage === 'won').length,
          }
        }), { headers })
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action', available: ['create_lead', 'create_invoice', 'create_client', 'create_opportunity', 'record_payment', 'get_leads', 'get_invoices', 'get_metrics'] }), { status: 400, headers })
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
  }
}