// BUSINESS CORE v8 - With input validation + proper error handling
// Migrated from InsForge (Deno) to Vercel (Node.js)

import { NextResponse } from 'next/server'
import { validate, schemas } from '../_lib/validation'

const OPENVIKING_URL = 'https://openviking-jggo.srv1583696.hstgr.cloud'
const OPENVIKING_KEY = process.env.OPENVIKING_API_KEY || ''

// In-memory store (resets on cold start - use external DB for persistence)
declare global {
  var businessStores: Map<string, { leads: any[]; invoices: any[]; opportunities: any[]; payments: any[]; clients: any[] }> | undefined
}

function getStore(companyId: string) {
  if (!globalThis.businessStores) globalThis.businessStores = new Map()
  if (!globalThis.businessStores.has(companyId)) {
    globalThis.businessStores.set(companyId, {
      leads: [],
      invoices: [],
      opportunities: [],
      payments: [],
      clients: []
    })
  }
  return globalThis.businessStores.get(companyId)!
}

async function ovStore(entityType: string, companyId: string, data: any) {
  try {
    const sessionRes = await fetch(OPENVIKING_URL + '/api/v1/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': OPENVIKING_KEY },
      body: JSON.stringify({ metadata: { entityType, companyId, type: 'business' } })
    })
    const sessionData = await sessionRes.json()
    const sessionId = sessionData?.result?.session_id
    if (!sessionId) return { error: 'No session' }
    const content = JSON.stringify({ _entity: entityType, companyId, ...data })
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

function scoreLead(source: string, interestLevel: string) {
  let score = 30
  if (source === 'referral') score += 30
  else if (source === 'inbound') score += 20
  else if (source === 'web') score += 10
  if (interestLevel === 'urgent') score += 25
  else if (interestLevel === 'high') score += 15
  else if (interestLevel === 'medium') score += 5
  return Math.min(score, 100)
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export async function POST(req: Request) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  }

  if (req.method === 'OPTIONS') return new NextResponse(null, { status: 204, headers })

  try {
    let body: Record<string, any> = {}
    try { body = await req.json() } catch { 
      return NextResponse.json({ error: 'Invalid JSON body', code: 'INVALID_JSON' }, { status: 400, headers })
    }
    
    const { action, company_id, data } = body

    // Validate input
    const validation = validate({ action, company_id }, schemas.businessAction)
    if (!validation.valid) {
      return NextResponse.json({ error: 'Validation failed', code: 'VALIDATION_ERROR', details: validation.errors }, { status: 400, headers })
    }

    const store = getStore(company_id)

    switch (action) {
      case 'create_lead': {
        const { name, email, source, interest_level } = data
        const score = scoreLead(source, interest_level)
        const agent = score >= 70 ? 'pelayo' : 'paco'
        const lead = {
          id: generateId(),
          name, email,
          source: source || 'web',
          interest_level: interest_level || 'medium',
          score,
          status: 'new',
          agent,
          created_at: new Date().toISOString()
        }
        store.leads.push(lead)
        ovStore('lead', company_id, lead).catch(err => console.error('ovStore lead failed:', err.message))
        return NextResponse.json({ success: true, agent, score, lead }, { headers })
      }

      case 'create_invoice': {
        const { client_name, items, tax_rate, due_days } = data
        const subtotal = items.reduce((s: number, i: any) => s + (i.quantity * i.unit_price), 0)
        const tax = Math.round(subtotal * (tax_rate || 21) / 100 * 100) / 100
        const total = Math.round((subtotal + tax) * 100) / 100
        const invoiceNumber = 'INV-' + Date.now().toString().slice(-8)
        const dueDate = new Date(Date.now() + (due_days || 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

        const invoice = {
          id: generateId(),
          invoiceNumber,
          client_name,
          items,
          subtotal,
          tax,
          total,
          status: 'draft',
          dueDate,
          created_at: new Date().toISOString()
        }
        store.invoices.push(invoice)
        ovStore('invoice', company_id, invoice).catch(err => console.error('ovStore invoice failed:', err.message))
        return NextResponse.json({ success: true, invoiceNumber, total, dueDate }, { headers })
      }

      case 'create_opportunity': {
        const { title, value, stage, client_name } = data
        const opportunity = {
          id: generateId(),
          title,
          value,
          stage: stage || 'discovery',
          probability: 20,
          client_name: client_name || '',
          created_at: new Date().toISOString()
        }
        store.opportunities.push(opportunity)
        ovStore('opportunity', company_id, opportunity).catch(err => console.error('ovStore opportunity failed:', err.message))
        return NextResponse.json({ success: true, opportunity }, { headers })
      }

      case 'record_payment': {
        const { invoice_number, amount, method } = data
        const payment = {
          id: generateId(),
          invoice_number,
          amount,
          method: method || 'transfer',
          status: 'completed',
          paid_at: new Date().toISOString()
        }
        store.payments.push(payment)
        const inv = store.invoices.find(i => i.invoiceNumber === invoice_number)
        if (inv) {
          inv.status = 'paid'
          inv.paid_amount = amount
          inv.paid_at = payment.paid_at
        }
        ovStore('payment', company_id, payment).catch(err => console.error('ovStore payment failed:', err.message))
        return NextResponse.json({ success: true, payment }, { headers })
      }

      case 'get_leads': {
        return NextResponse.json({ success: true, leads: store.leads }, { headers })
      }

      case 'get_invoices': {
        return NextResponse.json({ success: true, invoices: store.invoices }, { headers })
      }

      case 'get_opportunities': {
        return NextResponse.json({ success: true, opportunities: store.opportunities }, { headers })
      }

      case 'get_metrics': {
        const paidInv = store.invoices.filter(i => i.status === 'paid')
        const mrr = paidInv.reduce((s: number, i: any) => s + (i.total || 0), 0)
        const openOpps = store.opportunities.filter(o => o.stage !== 'won' && o.stage !== 'lost')
        const pipelineValue = openOpps.reduce((s: number, o: any) => s + (o.value || 0), 0)
        const now = new Date()
        const overdueInv = store.invoices.filter((i: any) => i.status !== 'paid' && i.dueDate && new Date(i.dueDate) < now)

        return NextResponse.json({
          success: true,
          metrics: {
            mrr: Math.round(mrr * 100) / 100,
            arr: Math.round(mrr * 12 * 100) / 100,
            pipelineValue: Math.round(pipelineValue * 100) / 100,
            overdueInvoices: overdueInv.length,
            activeLeads: store.leads.filter(l => l.status !== 'converted').length,
            activeClients: [...new Set(store.invoices.filter((i: any) => i.status === 'draft' || i.status === 'sent').map((i: any) => i.client_name))].length,
            wonOpportunities: store.opportunities.filter(o => o.stage === 'won').length,
            totalInvoices: store.invoices.length,
            paidInvoices: paidInv.length,
          }
        }, { headers })
      }

      case 'get_dashboard': {
        return NextResponse.json({
          success: true,
          dashboard: {
            hotLeads: store.leads.filter(l => l.score >= 70).slice(0, 5),
            recentInvoices: store.invoices.slice(0, 5),
            activeOpportunities: store.opportunities.filter(o => o.stage !== 'won' && o.stage !== 'lost').slice(0, 5)
          }
        }, { headers })
      }

      default:
        return NextResponse.json({
          error: 'Invalid action',
          available: ['create_lead', 'create_invoice', 'create_opportunity', 'record_payment', 'get_leads', 'get_invoices', 'get_opportunities', 'get_metrics', 'get_dashboard']
        }, { status: 400, headers })
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500, headers })
  }
}