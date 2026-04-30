/**
 * Pipeline Tasks - Get pending tasks
 * GET /api/pipeline/tasks
 */

import { NextResponse } from 'next/server'
import { getPendingTasks } from '../../../lib/pipeline'

export async function GET() {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  
  try {
    const tasks = await getPendingTasks(10)
    
    return NextResponse.json({
      success: true,
      count: tasks.length,
      tasks
    }, { headers })
    
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500, headers })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } })
}