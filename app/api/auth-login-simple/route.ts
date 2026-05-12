export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  return NextResponse.json({ message: 'Hello from auth-login!' })
}