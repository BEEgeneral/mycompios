import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  return NextResponse.json({ 
    success: true, 
    message: 'NO-RUNTIME EXPORT test works',
    method: 'POST'
  })
}

export async function GET() {
  return NextResponse.json({ method: 'GET', success: true })
}