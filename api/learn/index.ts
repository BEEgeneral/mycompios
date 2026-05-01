// LEARNING SYSTEM v4 - Learn endpoint
// Migrated from InsForge (Deno) to Vercel (Node.js)

import { NextResponse } from 'next/server'
import { query } from '../_lib/db'

const TAGS = ['#marketing', '#ventas', '#soporte', '#producto', '#cliente', '#operaciones', '#aprendizaje']

function extractTags(content: string) {
  const found: string[] = []
  const lower = content.toLowerCase()
  for (const tag of TAGS) {
    if (lower.includes(tag.substring(1))) found.push(tag)
  }
  return found.length > 0 ? found : ['#aprendizaje']
}

function calculateImportance(eventType: string, content: string) {
  let score = 5
  if (content.includes('error') || content.includes('fail')) score += 2
  if (content.includes('success') || content.includes('completado')) score += 1
  if (eventType === 'task') score += 2
  return Math.min(score, 10)
}

export async function GET(req: Request) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  }

  const url = new URL(req.url)
  const action = url.searchParams.get('action')
  const companyId = url.searchParams.get('company_id')

  if (action === 'learnings' && companyId) {
    try {
      const learnings = await query(
        'SELECT * FROM learning_logs WHERE company_id = $1 ORDER BY created_at DESC LIMIT 20',
        [companyId]
      )
      return NextResponse.json({ success: true, learnings, count: learnings.length }, { headers })
    } catch (e) {
      return NextResponse.json({ success: true, learnings: [], count: 0 }, { headers })
    }
  }

  return NextResponse.json({ success: true, tags: TAGS, actions: ['learn', 'learnings'] }, { headers })
}

export async function POST(req: Request) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  }

  if (req.method === 'OPTIONS') {
    return new NextResponse('', { status: 204, headers })
  }

  try {
    let body: Record<string, any> = {}
    try { body = await req.json() } catch { /* empty */ }
    const { action, company_id, event_type, content, tags } = body

    if (!company_id) return NextResponse.json({ error: 'company_id required' }, { status: 400, headers })

    if (action === 'learn' || event_type) {
      const text = typeof content === 'string' ? content : JSON.stringify(content)
      const extractedTags = tags || extractTags(text)
      const importance = calculateImportance(event_type || 'generic', text)

      let stored_via = 'memory_only'
      try {
        await query(
          `INSERT INTO learning_logs (company_id, event_type, content, tags, importance, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [company_id, event_type || 'generic', text, extractedTags.join(','), importance]
        )
        stored_via = 'learning_logs'
      } catch (e) {
        console.log('learning_logs insert failed:', e.message)
      }

      return NextResponse.json({ success: true, type: event_type || 'learning', tags: extractedTags, importance, stored_via }, { headers })
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400, headers })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500, headers })
  }
}