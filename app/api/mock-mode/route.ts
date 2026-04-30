// Mock Mode status endpoint
// In production, set MOCK_MODE=true in environment

import { NextResponse } from 'next/server'
import { isMockMode } from '../../lib/mock'

export async function GET() {
  const mockMode = isMockMode()
  
  return NextResponse.json({
    mock_mode: mockMode,
    description: mockMode 
      ? 'MOCK MODE ENABLED - No real LLM calls will be made'
      : 'Production mode - LLM calls are live',
    agents: ['paco', 'research', 'sales', 'finance', 'code', 'social', 'support']
  })
}

export async function POST(request: Request) {
  try {
    const { enabled } = await request.json()
    
    return NextResponse.json({
      message: 'MOCK_MODE is controlled by environment variable MOCK_MODE',
      current_value: process.env.MOCK_MODE,
      instructions: 'Set MOCK_MODE=true in .env to enable mock mode',
      note: 'In production, this would require a server restart to take effect'
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}