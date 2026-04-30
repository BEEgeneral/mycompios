/**
 * Maintenance Tasks API
 * POST /api/maintenance
 */

import { NextResponse } from 'next/server'
import { runMaintenance } from '../../lib/maintenance'

export async function POST() {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  
  try {
    const result = await runMaintenance()
    
    return NextResponse.json({
      success: true,
      ...result
    }, { headers })
    
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
