// Mock Mode toggle - inspired by Polsia's CLAUDE_CLI_MOCK=true
// Enable/disable mock mode for testing without real LLM calls

import { NextResponse } from 'next/server'

export async function GET() {
  const mockMode = process.env.MOCK_MODE === 'true'
  
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
    
    // Note: MOCK_MODE is set via environment variable
    // This endpoint is for checking status only
    // To enable mock mode, set MOCK_MODE=true in environment
    
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