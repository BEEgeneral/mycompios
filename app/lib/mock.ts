// Mock and Sandbox mode utilities
// Inspired by Polsia's CLAUDE_CLI_MOCK and SANDBOX_MODE

/**
 * MOCK_MODE=true - Returns mock responses instead of calling LLM
 */
export function isMockMode(): boolean {
  return process.env.MOCK_MODE === 'true'
}

/**
 * SANDBOX_MODE=true - Prevents real external actions (Stripe, Twitter, Tavily, etc.)
 * For development and testing safety
 */
export function isSandboxMode(): boolean {
  return process.env.SANDBOX_MODE !== 'false' // Default to TRUE for safety
}

/**
 * Check if an action is allowed in sandbox mode
 */
export function isActionAllowed(action: string): boolean {
  if (isSandboxMode()) {
    console.log(`[SANDBOX] Blocked action: ${action}`)
    return false
  }
  return true
}

/**
 * Wrap an external action with sandbox check
 */
export function sandboxCheck<T>(
  action: string,
  fn: () => T,
  fallback: T
): T {
  if (!isActionAllowed(action)) {
    return fallback
  }
  return fn()
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
