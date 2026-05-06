export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    let email = '', password = '', name = '', company = ''
    
    if (body.startsWith('{')) {
      const json = JSON.parse(body)
      email = json.email || ''
      password = json.password || ''
      name = json.name || ''
      company = json.company || ''
    } else {
      const params = new URLSearchParams(body)
      email = params.get('email') || ''
      password = params.get('password') || ''
      name = params.get('name') || ''
      company = params.get('company') || ''
    }

    if (!email || !password || !name || !company) {
      return NextResponse.json({
        error: 'Missing required fields',
        received: { email, name, company: !!company, hasPassword: !!password }
      }, { status: 400 })
    }

    // Simple validation - email format
    if (!email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    // Return success without DB
    return NextResponse.json({
      success: true,
      message: 'Validation passed, no DB used',
      received: { email, name, company }
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}