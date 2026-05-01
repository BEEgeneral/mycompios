/**
 * Auto Research API - Research company from website
 * POST /api/auto-research
 * Uses research-service.ts (Polsia-style services layer)
 */

import { NextResponse } from 'next/server'
import { researchCompany, updateCompanyResearch } from '../../lib/services/research-service'

export async function POST(req: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  
  try {
    const { company_id, website, company_name } = await req.json()
    
    if (!company_id) {
      return NextResponse.json({ success: false, error: 'company_id required' }, { status: 400, headers })
    }
    
    // Research company using service
    const research = await researchCompany(company_id, company_name || 'Unknown', website)
    
    // Update company with research results
    await updateCompanyResearch(company_id, research)
    
    return NextResponse.json({
      success: true,
      research
    }, { status: 200, headers })
    
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers })
  }
}