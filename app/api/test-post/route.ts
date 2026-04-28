'use strict'
import { NextResponse } from 'next/server'
export const runtime = 'nodejs'

export async function POST(req) {
  try {
    const body = await req.json()
    return NextResponse.json({ received: true, body })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
