// LEARNING SYSTEM v4 - Chat endpoint (delegates to autonomous agent)
// Migrated from InsForge (Deno) to Vercel (Node.js)

import { NextResponse } from 'next/server'
import { query } from '../_lib/db'

const OPENVIKING_URL = 'https://openviking-jggo.srv1583696.hstgr.cloud'
const OPENVIKING_KEY = process.env.OPENVIKING_API_KEY || ''

const LLM_CONFIG: Record<string, { url: string; model: string }> = {
  minimax: { url: 'https://api.minimax.io/v1/text/chatcompletion_v2', model: 'MiniMax-M2.7' },
  openrouter: { url: 'https://openrouter.ai/api/v1/chat/completions', model: 'openai/gpt-3.5-turbo' },
  openai: { url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' }
}

const LLM_KEYS: Record<string, string> = {
  minimax: process.env.MINIMAX_API_KEY || '',
  openrouter: process.env.OPENROUTER_API_KEY || '',
  openai: process.env.OPENAI_API_KEY || ''
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