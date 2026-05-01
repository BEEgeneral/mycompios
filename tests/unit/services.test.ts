/**
 * Service Unit Tests
 */

import { describe, it, expect } from 'vitest'

describe('Caveman Token Compression', () => {
  it('should compress text', async () => {
    const { caveman } = await import('../../app/lib/caveman')
    
    const original = 'Sure! Based on my analysis, I think we should proceed with the marketing campaign.'
    const compressed = caveman(original, 'full')
    
    // Verify compression happened (should be shorter)
    expect(compressed.length).toBeLessThan(original.length)
  })

  it('should estimate savings', async () => {
    const { estimateSavings } = await import('../../app/lib/caveman')
    
    const result = estimateSavings('This is a test sentence', 'full')
    
    expect(result.originalTokens).toBeGreaterThan(0)
    expect(result.savingsPercent).toBeGreaterThan(0)
  })
})

describe('Mock Mode', () => {
  it('should detect sandbox mode', async () => {
    const { isSandboxMode } = await import('../../app/lib/mock')
    
    // Default is true for safety
    expect(isSandboxMode()).toBe(true)
  })
})

describe('Agent Map', () => {
  it('should have valid agent types', async () => {
    const { VALID_AGENT_TYPES, AGENT_MAP } = await import('../../app/lib/agents')
    
    expect(VALID_AGENT_TYPES).toContain('paco')
    expect(VALID_AGENT_TYPES).toContain('research')
    expect(VALID_AGENT_TYPES).toContain('sales')
    expect(VALID_AGENT_TYPES).toContain('finance')
    expect(Object.keys(AGENT_MAP).length).toBeGreaterThan(0)
  })
})
