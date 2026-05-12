export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const res = await fetch('https://guuimyx3.functions.insforge.app/auth-test-min', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    
    const data = await res.json()
    
    return NextResponse.json({ 
      success: true, 
      message: 'fetch works',
      insforgeResponse: data 
    })
  } catch (err: any) {
    return NextResponse.json({ 
      success: false, 
      error: err.message 
    }, { status: 500 })
  }
}