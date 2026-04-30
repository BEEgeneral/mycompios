// Mock mode utilities - for testing without real LLM calls
// Inspired by Polsia's CLAUDE_CLI_MOCK=true

export function isMockMode(): boolean {
  return process.env.MOCK_MODE === 'true'
}

export function createMockResult(taskName: string) {
  return {
    success: true,
    summary: `[MOCK] Completed: ${taskName}`,
    details: {
      agent_type: 'mock',
      duration_secs: 0.1,
      mock: true
    }
  }
}

export function getMockStubResponse(taskName: string, agentType: string): string {
  return `[MOCK:${agentType.toUpperCase()}] Task completed: ${taskName}`
}