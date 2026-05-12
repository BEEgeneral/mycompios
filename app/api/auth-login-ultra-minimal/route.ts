import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  return NextResponse.json({ 
    success: true, 
    message: 'Minimal route works',
    path: '/api/auth-login-ultra-minimal'
  })
}