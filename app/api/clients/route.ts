/**
 * Clients API - Get company clients
 * GET /api/clients?company_id=XXX
 * Uses marketing-service.ts (Polsia-style services layer)
 */

import { NextResponse } from 'next/server'
import { getProspects } from '../../lib/services/marketing-service'

export async function GET(req: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  
  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('company_id')
    
    if (!companyId) {
      return NextResponse.json({ error: 'company_id required' }, { status: 400, headers })
    }
    
    const prospects = await getProspects(companyId)
    
    // Filter out 'new' prospects for clients view
    const clients = prospects.filter(p => p.status !== 'new')
    
    return NextResponse.json({
      clients,
      count: clients.length
    }, { headers })
    
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500, headers })
  }
}