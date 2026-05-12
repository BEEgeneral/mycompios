export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

const INSFORGE_AUTH = 'https://guuimyx3.functions.insforge.app/auth-login-direct'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('Auth login proxy: forwarding to InsForge', body.email)
    
    const res = await fetch(INSFORGE_AUTH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    
    console.log('InsForge response status:', res.status)
    
    const data = await res.json()
    console.log('InsForge response data:', JSON.stringify(data).slice(0, 200))
    
    return NextResponse.json(data, { status: res.status })
  } catch (err: any) {
    console.error('Auth proxy error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}