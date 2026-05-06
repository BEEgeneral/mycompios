export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  console.log('minimal-test called')
  return NextResponse.json({ 
    success: true, 
    message: 'minimal test works',
    env: {
      hasHost: !!process.env.NEON_HOST,
      hasDb: !!process.env.NEON_DB,
      hasUser: !!process.env.NEON_USER,
      hasPassword: !!process.env.NEON_PASSWORD,
    }
  })
}

export async function GET() {
  return NextResponse.json({ method: 'GET', success: true })
}