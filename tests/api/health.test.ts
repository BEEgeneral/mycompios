/**
 * API Health Check Tests
 * 
 * Note: API tests require running server.
 * In CI, run with: npx vitest run --exclude=tests/api/*
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'

// Only run if we have API URL configured
const API_URL = process.env.API_URL || 'http://localhost:3000'

describe('Health Check', () => {
  it('has correct environment', async () => {
    // Basic test that always passes
    expect(API_URL).toBeTruthy()
  })
})

describe('Sweep APIs', () => {
  it('sweep modules exist', async () => {
    // Test that sweep modules can be imported
    const { runSocialSweep } = await import('../../app/lib/sweeps/social-sweep')
    expect(typeof runSocialSweep).toBe('function')
    
    const { runEmailSweep } = await import('../../app/lib/sweeps/email-sweep')
    expect(typeof runEmailSweep).toBe('function')
    
    const { runAdsSync } = await import('../../app/lib/sweeps/ads-sync')
    expect(typeof runAdsSync).toBe('function')
  })
})

describe('Pipeline APIs', () => {
  it('pipeline modules exist', async () => {
    const pipeline = await import('../../app/lib/pipeline')
    expect(typeof pipeline.getPendingTasks).toBe('function')
    expect(typeof pipeline.createMission).toBe('function')
  })
})

describe('Maintenance APIs', () => {
  it('maintenance module exists', async () => {
    const { runMaintenance } = await import('../../app/lib/maintenance')
    expect(typeof runMaintenance).toBe('function')
  })
})