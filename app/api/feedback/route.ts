/**
 * Feedback API - NPS scores
 * POST /api/feedback
 */

import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { score, comment } = await req.json()

    if (!score || score < 1 || score > 5) {
      return NextResponse.json(
        { error: 'Score must be 1-5' },
        { status: 400 }
      )
    }

    // Log to console (would normally save to DB)
    console.log(`NPS Feedback: score=${score}, comment=${comment || 'none'}`)

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}

export async function GET() {
  // For email sequence NPS email links
  return NextResponse.redirect('/feedback')
}