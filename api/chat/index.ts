// LEARNING SYSTEM v4 - Chat endpoint (delegates to autonomous agent)
// Migrated from InsForge (Deno) to Vercel (Node.js)

import { NextResponse } from 'next/server'
import { query } from '../_lib/db'

const OPENVIKING_URL = 'https://openviking-jggo.srv1583696.hstgr.cloud'
const OPENVIKING_KEY = 'BnjbkRgOIn4MBywXDLaI6S0R43bnxQIO'

const LLM_CONFIG: Record<string, { url: string; model: string }> = {
  minimax: { url: 'https://api.minimax.io/v1/text/chatcompletion_v2', model: 'MiniMax-M2.7' },
  openrouter: { url: 'https://openrouter.ai/api/v1/chat/completions', model: 'openai/gpt-3.5-turbo' },
  openai: { url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' }
}

const LLM_KEYS: Record<string, string> = {
  minimax: 'sk-cp-kewjUeaiHUlb-tvKgHb4JIOJt2-GrY6Uj9Y-hPFvOq3QyBsGAlbSQIw-eT7XERlLNrQ2l1-sy42pHSfGloIP46fp52OaX76Z8s6T5MkXMi0CObEeaa5JxFI',
  openrouter: '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',
  openai: 'sk-proj-REDACTED'
}

export async function POST(req: Request) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  }

  if (req.method === 'OPTIONS') {
    return new NextResponse('', { status: 204, headers })
  }

  try {
    const body = await req.json()
    const { message, company_id, user_id, session_id } = body

    if (!message) {
      return NextResponse.json({ error: 'message required' }, { status: 400, headers })
    }

    // Route to autonomous agent chat
    try {
      const autonomousRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/autonomous`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          companyId: company_id,
          instruction: message,
          userId: user_id
        })
      })
      const data = await autonomousRes.json()
      return NextResponse.json(data, { status: autonomousRes.status, headers })
    } catch (e) {
      // Fallback: direct LLM response
      const config = LLM_CONFIG['minimax']
      const key = LLM_KEYS['minimax']
      const res = await fetch(config.url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: 'You are a helpful assistant for MyCompi. Keep responses concise.' },
            { role: 'user', content: message }
          ],
          max_tokens: 500
        })
      })
      const data = await res.json()
      const response = data?.choices?.[0]?.message?.content || 'No response'
      return NextResponse.json({ success: true, response, provider: 'minimax' }, { headers })
    }
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500, headers })
  }
}