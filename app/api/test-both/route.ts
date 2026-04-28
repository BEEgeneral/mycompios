'use strict'
import { NextResponse } from 'next/server'
export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({ method: 'GET', works: true })
}

export async function POST(req) {
  try {
    const body = await req.json()
    return NextResponse.json({ method: 'POST', received: body })
  } catch (err) {
    return NextResponse.json({ method: 'POST', error: err.message }, { status: 400 })
  }
}
