// FIN AUTONOMOUS - Financial autonomous agent
// Based on autonomous.js core patterns, financial focus

import { NextResponse } from 'next/server'

const OPENVIKING_URL = 'https://openviking-jggo.srv1583696.hstgr.cloud'
const OPENVIKING_KEY = 'BnjbkRgOIn4MBywXDLaI6S0R43bnxQIO'

// In-memory state for fin agent
declare global {
  var finState: {
    companyId: string
    initialized: boolean
    timestamp: string
    metrics: {
      mrr: number
      arr: number
      pipelineValue: number
      overdueInvoices: number
      activeLeads: number
    }
    learning: { iteration: number; avgConfidence: number }
  } | undefined
}

export async function GET(req: Request) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  }

  if (req.method === 'OPTIONS') {
    return new NextResponse('', { status: 204, headers })
  }

  const url = new URL(req.url)
  const action = url.searchParams.get('action')

  if (action === 'status' && globalThis.finState) {
    return NextResponse.json({ success: true, ...globalThis.finState }, { headers })
  }

  return NextResponse.json({
    fin: true,
    version: '1.0.0',
    actions: ['init', 'metrics', 'forecast', 'analyze']
  }, { headers })
}

export async function POST(req: Request) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  }

  if (req.method === 'OPTIONS') {
    return new NextResponse('', { status: 204, headers })
  }

  try {
    const body = await req.json()
    const { action, company_id, metrics } = body as { action?: string; company_id?: string; metrics?: any }

    switch (action) {
      case 'init': {
        globalThis.finState = {
          companyId: company_id || 'default',
          initialized: true,
          timestamp: new Date().toISOString(),
          metrics: { mrr: 0, arr: 0, pipelineValue: 0, overdueInvoices: 0, activeLeads: 0 },
          learning: { iteration: 0, avgConfidence: 0.85 }
        }
        return NextResponse.json({ success: true, initialized: true, companyId: company_id }, { headers })
      }

      case 'update_metrics': {
        if (!globalThis.finState) {
          globalThis.finState = {
            companyId: company_id || 'default',
            initialized: true,
            timestamp: new Date().toISOString(),
            metrics: metrics || { mrr: 0, arr: 0, pipelineValue: 0, overdueInvoices: 0, activeLeads: 0 },
            learning: { iteration: 0, avgConfidence: 0.85 }
          }
        } else if (metrics) {
          globalThis.finState.metrics = { ...globalThis.finState.metrics, ...metrics }
        }
        globalThis.finState.timestamp = new Date().toISOString()
        return NextResponse.json({ success: true, metrics: globalThis.finState.metrics }, { headers })
      }

      case 'forecast': {
        if (!globalThis.finState) {
          return NextResponse.json({ error: 'Not initialized' }, { status: 400, headers })
        }
        const mrr = globalThis.finState.metrics.mrr
        return NextResponse.json({
          success: true,
          forecast: {
            mrr,
            arr: mrr * 12,
            projected_3m: mrr * 3 * 0.9,
            projected_6m: mrr * 6 * 0.85,
            runway_months: mrr > 0 ? Math.round((mrr * 6) / 49) : 0
          }
        }, { headers })
      }

      case 'analyze': {
        if (!globalThis.finState) {
          return NextResponse.json({ error: 'Not initialized' }, { status: 400, headers })
        }
        const insights: string[] = []
        if (globalThis.finState.metrics.overdueInvoices > 0) {
          insights.push(`${globalThis.finState.metrics.overdueInvoices} facturas impagadas`)
        }
        if (globalThis.finState.metrics.mrr === 0) {
          insights.push('Sin MRR todavía')
        }
        if (globalThis.finState.metrics.activeLeads > 5) {
          insights.push('Pipeline sano con leads activos')
        }
        return NextResponse.json({ success: true, insights }, { headers })
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400, headers })
    }
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500, headers })
  }
}