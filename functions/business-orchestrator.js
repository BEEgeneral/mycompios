// BUSINESS ORCHESTRATOR - Core autonomous agent for business management
// Coordinates Pelayo, Paco, BRAIN for full business operations
// Handles: leads, opportunities, invoices, payments, follow-ups

const CONFIG = {
  API_BASE: 'https://guuimyx3.eu-central.insforge.app',
  ANON_KEY: 'ik_448e7387f3c4b7f16764bb092b4a84b2',
  RESEND_API_KEY: '${process.env.RESEND_API_KEY}',
  FRONTEND_URL: 'https://guuimyx3.insforge.site',
}

async function fetchAuth(url, options = {}) {
  return fetch(url, { ...options, headers: { apikey: CONFIG.ANON_KEY, 'Content-Type': 'application/json', ...(options.headers || {}) } })
}

// Agent storage in client_tasks (task_id < 0)
async function agentStore(companyId, dataType, content, metadata = {}) {
  const now = new Date().toISOString()
  const taskIdMap = { learning: -1, lead: -10, opportunity: -11, invoice: -12, payment: -13, expense: -14, metric: -15 }
  const taskId = taskIdMap[dataType] || -1
  
  const res = await fetchAuth(CONFIG.API_BASE + '/rest/client_tasks', {
    method: 'POST',
    body: JSON.stringify({
      company_id: companyId,
      task_id: taskId,
      agent_id: metadata.agent_id || 'pelayo',
      status: 'done',
      priority: 'low',
      context: { type: dataType, content, metadata, created_at: now }
    })
  })
  return res.ok
}

// Get business data
async function getBusinessData(companyId, table, filters = '') {
  const res = await fetchAuth(CONFIG.API_BASE + `/rest/${table}?company_id=eq.${companyId}${filters}`)
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

// Create follow-up
async function createFollowUp(companyId, entityType, entityId, action, agentId, scheduledFor) {
  const res = await fetchAuth(CONFIG.API_BASE + '/rest/follow_ups', {
    method: 'POST',
    body: JSON.stringify({
      company_id: companyId,
      entity_type: entityType,
      entity_id: entityId,
      action,
      agent_id: agentId,
      scheduled_for: scheduledFor,
      created_at: new Date().toISOString()
    })
  })
  return res.ok
}

// Send email notification
async function sendEmail(to, subject, html) {
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${CONFIG.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'MyCompi <noreply@mycompi.com>', to: [to], subject, html })
    })
    return true
  } catch (e) { return false }
}

// Lead scoring algorithm
function scoreLead(lead) {
  let score = 30 // base
  if (lead.source === 'referral') score += 30
  else if (lead.source === 'inbound') score += 20
  else if (lead.source === 'web') score += 10
  
  if (lead.interest_level === 'urgent') score += 25
  else if (lead.interest_level === 'high') score += 15
  else if (lead.interest_level === 'medium') score += 5
  
  return Math.min(score, 100)
}

// Determine next agent action based on business state
function determineNextAction(metrics) {
  const actions = []
  
  // Check overdue invoices
  if (metrics.overdueInvoices > 0) {
    actions.push({ priority: 'high', action: 'send_payment_reminder', reason: `${metrics.overdueInvoices} overdue invoices`, target: 'invoices' })
  }
  
  // Check leads needing follow-up
  if (metrics.activeLeads > 0) {
    actions.push({ priority: 'medium', action: 'follow_up_leads', reason: `${metrics.activeLeads} active leads`, target: 'leads' })
  }
  
  // Check opportunities in pipeline
  if (metrics.openOpportunities > 0) {
    actions.push({ priority: 'medium', action: 'advance_pipeline', reason: `${metrics.pipelineValue}€ in pipeline`, target: 'opportunities' })
  }
  
  // Check metrics for reporting
  if (metrics.daysSinceReport >= 7) {
    actions.push({ priority: 'low', action: 'generate_weekly_report', reason: 'Weekly report due', target: 'reporting' })
  }
  
  return actions.sort((a, b) => (a.priority === 'high' ? -1 : b.priority === 'high' ? 1 : 0))
}

// Process overdue invoice
async function processOverdueInvoice(invoice, companyId) {
  const daysOverdue = Math.floor((Date.now() - new Date(invoice.due_date)) / (1000 * 60 * 60 * 24))
  
  let action = 'first_reminder'
  let emailTemplate = 'reminder_1'
  
  if (daysOverdue >= 30) {
    action = 'escalate'
    emailTemplate = 'reminder_escalate'
  } else if (daysOverdue >= 14) {
    action = 'second_reminder'
    emailTemplate = 'reminder_2'
  }
  
  // Store action
  await agentStore(companyId, 'payment', `Processing overdue invoice ${invoice.invoice_number}`, {
    action, days_overdue: daysOverdue, invoice_id: invoice.id
  })
  
  // Create follow-up
  await createFollowUp(companyId, 'invoice', invoice.id, action, 'paco', new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString())
  
  return { action, daysOverdue, invoiceId: invoice.id }
}

// Process new lead
async function processNewLead(lead, companyId) {
  const score = scoreLead(lead)
  
  // Update lead score
  await fetchAuth(CONFIG.API_BASE + `/rest/leads?id=eq.${lead.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ score, updated_at: new Date().toISOString() })
  })
  
  // Determine agent assignment based on score
  let assignedAgent = 'paco'
  if (score >= 70) assignedAgent = 'pelayo' // High value lead goes to executive
  
  await fetchAuth(CONFIG.API_BASE + `/rest/leads?id=eq.${lead.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ assigned_agent: assignedAgent, next_follow_up: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() })
  })
  
  // Create follow-up
  await createFollowUp(companyId, 'lead', lead.id, 'initial_contact', assignedAgent, new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString())
  
  // Store learning
  await agentStore(companyId, 'lead', `New lead: ${lead.name} (score: ${score})`, { source: lead.source, agent: assignedAgent })
  
  return { leadId: lead.id, score, assignedAgent }
}

// Generate business metrics
async function generateMetrics(companyId) {
  const [invoices, leads, opportunities, payments] = await Promise.all([
    getBusinessData(companyId, 'invoices'),
    getBusinessData(companyId, 'leads'),
    getBusinessData(companyId, 'opportunities'),
    getBusinessData(companyId, 'payments'),
  ])
  
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  
  const monthlyInvoices = invoices.filter(i => new Date(i.issue_date) >= startOfMonth)
  const mrr = monthlyInvoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + parseFloat(i.total || 0), 0)
  const openOpportunities = opportunities.filter(o => !['won', 'lost'].includes(o.stage))
  const pipelineValue = openOpportunities.reduce((sum, o) => sum + parseFloat(o.value || 0), 0)
  const overdueInvoices = invoices.filter(i => i.status === 'overdue').length
  const activeLeads = leads.filter(l => !['converted', 'lost'].includes(l.status)).length
  
  const metrics = {
    company_id: companyId,
    date: now.toISOString().split('T')[0],
    mrr: Math.round(mrr * 100) / 100,
    arr: Math.round(mrr * 12 * 100) / 100,
    active_leads: activeLeads,
    open_opportunities: openOpportunities.length,
    pipeline_value: Math.round(pipelineValue * 100) / 100,
    invoices_overdue: overdueInvoices,
    invoices_paid: monthlyInvoices.filter(i => i.status === 'paid').length,
  }
  
  // Store metrics
  await fetchAuth(CONFIG.API_BASE + '/rest/business_metrics', {
    method: 'POST',
    body: JSON.stringify(metrics)
  })
  
  return metrics
}

export default async function handler(req, ctx) {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers })

  try {
    let body = {}
    try { body = await req.json() } catch { /* empty */ }
    
    const { action, company_id, data, agent_id } = body

    // GET: dashboard/metrics
    if (req.method === 'GET') {
      if (!company_id) return new Response(JSON.stringify({ error: 'company_id required' }), { status: 400, headers })
      
      const [leads, opportunities, invoices, metrics] = await Promise.all([
        getBusinessData(company_id, 'leads', '&status=neq.converted&status=neq.lost&order=created_at.desc&limit=10'),
        getBusinessData(company_id, 'opportunities', '&status=neq.won&status=neq.lost&order=value.desc&limit=10'),
        getBusinessData(company_id, 'invoices', '&status=neq.paid&status=neq.cancelled&order=due_date.asc&limit=10'),
        getBusinessData(company_id, 'business_metrics', '&order=date.desc&limit=30'),
      ])
      
      const todayMetrics = await generateMetrics(company_id)
      
      return new Response(JSON.stringify({
        success: true,
        dashboard: {
          leads: leads.length,
          opportunities: opportunities.length,
          pipelineValue: opportunities.reduce((s, o) => s + parseFloat(o.value || 0), 0),
          overdueInvoices: invoices.filter(i => i.status === 'overdue').length,
          mrr: todayMetrics.mrr,
        },
        todayMetrics,
        recentLeads: leads.slice(0, 5),
        recentOpportunities: opportunities.slice(0, 5),
        recentInvoices: invoices.filter(i => i.status !== 'draft').slice(0, 5),
      }), { headers })
    }

    // POST actions
    if (!company_id) return new Response(JSON.stringify({ error: 'company_id required' }), { status: 400, headers })

    switch (action) {
      case 'process_leads': {
        const leads = await getBusinessData(company_id, 'leads', '&status=eq.new')
        const results = []
        for (const lead of leads.slice(0, 5)) {
          const r = await processNewLead(lead, company_id)
          results.push(r)
        }
        return new Response(JSON.stringify({ success: true, processed: results.length, results }), { headers })
      }

      case 'process_overdue_invoices': {
        const invoices = await getBusinessData(company_id, 'invoices', '&status=eq.overdue')
        const results = []
        for (const invoice of invoices.slice(0, 5)) {
          const r = await processOverdueInvoice(invoice, company_id)
          results.push(r)
        }
        return new Response(JSON.stringify({ success: true, processed: results.length, results }), { headers })
      }

      case 'generate_metrics': {
        const metrics = await generateMetrics(company_id)
        return new Response(JSON.stringify({ success: true, metrics }), { headers })
      }

      case 'next_actions': {
        const metrics = await generateMetrics(company_id)
        const actions = determineNextAction({
          overdueInvoices: metrics.invoices_overdue,
          activeLeads: metrics.active_leads,
          openOpportunities: metrics.open_opportunities,
          pipelineValue: metrics.pipeline_value,
          daysSinceReport: 7,
        })
        return new Response(JSON.stringify({ success: true, actions, metrics }), { headers })
      }

      case 'create_lead': {
        const { name, email, source, interest_level } = data
        const score = interest_level === 'urgent' ? 85 : interest_level === 'high' ? 65 : interest_level === 'medium' ? 40 : 20
        const res = await fetchAuth(CONFIG.API_BASE + '/rest/leads', {
          method: 'POST',
          body: JSON.stringify({
            company_id, name, email, source: source || 'web',
            interest_level: interest_level || 'medium',
            score, status: 'new',
            assigned_agent: score >= 70 ? 'pelayo' : 'paco',
            next_follow_up: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date().toISOString()
          })
        })
        const lead = await res.json()
        await createFollowUp(company_id, 'lead', lead.id || lead[0]?.id, 'initial_contact', score >= 70 ? 'pelayo' : 'paco', new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString())
        await agentStore(company_id, 'lead', `New lead: ${name}`, { source, score })
        return new Response(JSON.stringify({ success: true, lead }), { headers })
      }

      case 'create_invoice': {
        const { client_id, items, tax_rate, due_days, notes } = data
        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
        const taxAmount = subtotal * ((tax_rate || 21) / 100)
        const total = subtotal + taxAmount
        const dueDate = new Date(Date.now() + (due_days || 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        
        const res = await fetchAuth(CONFIG.API_BASE + '/rest/invoices', {
          method: 'POST',
          body: JSON.stringify({
            company_id, client_id,
            status: 'draft',
            issue_date: new Date().toISOString().split('T')[0],
            due_date: dueDate,
            subtotal: Math.round(subtotal * 100) / 100,
            tax_rate: tax_rate || 21,
            tax_amount: Math.round(taxAmount * 100) / 100,
            total: Math.round(total * 100) / 100,
            items: JSON.stringify(items),
            notes,
            created_at: new Date().toISOString()
          })
        })
        const invoice = await res.json()
        await agentStore(company_id, 'invoice', `Invoice created: ${total}€`, { client_id, items: items.length })
        return new Response(JSON.stringify({ success: true, invoice }), { headers })
      }

      case 'record_payment': {
        const { invoice_id, amount, method, reference } = data
        const res = await fetchAuth(CONFIG.API_BASE + '/rest/payments', {
          method: 'POST',
          body: JSON.stringify({
            company_id, invoice_id,
            amount, method: method || 'transfer',
            reference, status: 'completed',
            executed_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          })
        })
        
        // Update invoice status
        await fetchAuth(CONFIG.API_BASE + `/rest/invoices?id=eq.${invoice_id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'paid', paid_at: new Date().toISOString(), paid_amount: amount })
        })
        
        await agentStore(company_id, 'payment', `Payment received: ${amount}€`, { invoice_id, method })
        return new Response(JSON.stringify({ success: true }), { headers })
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action', available: ['process_leads', 'process_overdue_invoices', 'generate_metrics', 'next_actions', 'create_lead', 'create_invoice', 'record_payment'] }), { status: 400, headers })
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
  }
}