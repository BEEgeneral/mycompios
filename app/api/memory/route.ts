/**
 * Memory API - Memory entries for company
 * GET /api/memory?company_id=X&type=Y
 * POST /api/memory - Store new memory entry
 * Uses memory-service.ts (Polsia-style services layer)
 */

import { NextResponse } from 'next/server'
import { storeMemory, getRecentMemories, getMemoriesByType } from '../../lib/services/memory-service'

export async function GET(req: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  
  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('company_id')
    const type = searchParams.get('type')

    if (!companyId) {
      return NextResponse.json({ error: 'company_id required' }, { status: 400, headers })
    }

    let entries
    if (type) {
      entries = await getMemoriesByType(companyId, type as any)
    } else {
      entries = await getRecentMemories(companyId, 50)
    }

    return NextResponse.json({
      entries,
      count: entries.length
    }, { status: 200, headers })
    
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500, headers })
  }
}

export async function POST(req: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  
  try {
    const { company_id, entry_type, content, tags, source, related_task_id } = await req.json()

    if (!company_id || !entry_type || !content) {
      return NextResponse.json({ error: 'company_id, entry_type, content required' }, { status: 400, headers })
    }

    const entry = await storeMemory({
      company_id,
      entry_type,
      content,
      tags: tags || [],
      source: source || 'manual',
      related_task_id
    })

    return NextResponse.json({ success: true, entry }, { status: 200, headers })
    
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500, headers })
  }
}