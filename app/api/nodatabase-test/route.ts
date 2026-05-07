export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  // Pure test - no pg, no DB
  return NextResponse.json({ 
    success: true, 
    message: 'NO-DB test works',
    method: 'POST'
  })
}

export async function GET() {
  return NextResponse.json({ method: 'GET', success: true })
}