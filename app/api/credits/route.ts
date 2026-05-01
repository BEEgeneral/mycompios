/**
 * Credits API - Get company credits
 * GET /api/credits?company_id=XXX
 * Uses company-service.ts (Polsia-style services layer)
 */

import { NextResponse } from 'next/server'
import { getCompany } from '../../lib/services/company-service'

export async function GET(req: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  
  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('company_id')
    
    if (!companyId) {
      return NextResponse.json({ error: 'company_id required' }, { status: 400, headers })
    }
    
    const company = await getCompany(companyId)
    
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404, headers })
    }
    
    const credits_total = company.credits_total || 5
    const credits_used = company.credits_used || 0
    
    return NextResponse.json({
      credits: {
        total: credits_total,
        used: credits_used,
        remaining: credits_total - credits_used
      }
    }, { headers })
    
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500, headers })
  }
}