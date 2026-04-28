'use strict'
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ method: 'GET', works: true })
}

export async function POST(req) {
  const body = await req.json()
  return NextResponse.json({ method: 'POST', received: body })
}