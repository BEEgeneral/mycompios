/**
 * Auth Magic Link - Passwordless authentication
 * POST /api/auth-magic
 */

import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  
  try {
    const { email } = await req.json()
    
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Email required' }, { status: 400, headers })
    }
    
    // In production, this would:
    // 1. Generate a magic link token
    // 2. Send email via Resend
    // 3. Store token with expiration
    
    // For now, return mock success
    return NextResponse.json({
      success: true,
      message: 'Magic link sent (mock)'
    }, { headers })
    
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500, headers })
  }
}