'use strict'
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ test: 'GET works' })
}

export async function POST() {
  return NextResponse.json({ test: 'POST works' })
}