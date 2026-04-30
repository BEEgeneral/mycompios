/**
 * Email Sweep API
 * POST /api/sweeps/email
 */

import { NextResponse } from 'next/server'
import { runEmailSweep } from '../../../lib/sweeps/email-sweep'

export async function POST(request: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  
  try {
    const { company_id } = await request.json().catch(() => ({}))
    const result = await runEmailSweep(company_id)
    
    return NextResponse.json(result, { status: result.success ? 200 : 500, headers })
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500, headers })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } })
}