export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

const INSFORGE_AUTH = 'https://guuimyx3.functions.insforge.app/auth-login-direct'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    const res = await fetch(INSFORGE_AUTH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    
    const data = await res.json()
    
    return NextResponse.json(data, { status: res.status })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}