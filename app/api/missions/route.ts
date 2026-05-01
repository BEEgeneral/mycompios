/**
 * Missions API - Get company missions
 * GET /api/missions?company_id=XXX
 * Uses pipeline/index.ts (Polsia-style services layer)
 */

import { NextResponse } from 'next/server'
import { getActiveMissions } from '../../lib/pipeline'

export async function GET(req: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  
  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('company_id')
    
    if (!companyId) {
      return NextResponse.json({ error: 'company_id required' }, { status: 400, headers })
    }
    
    const missions = await getActiveMissions(companyId)
    
    return NextResponse.json({
      missions
    }, { headers })
    
  } catch (err) {
    console.error('Missions API error:', err)
    return NextResponse.json({ error: err.message }, { status: 500, headers })
  }
}