/**
 * API Health Check Tests
 */

import { describe, it, expect } from 'vitest'

describe('Health Check', () => {
  it('should return 200 for health endpoint', async () => {
    const res = await fetch('/api/health-check')
    expect(res.status).toBe(200)
  })
})

describe('Sweep APIs', () => {
  it('should run social sweep', async () => {
    const res = await fetch('/api/sweeps/social', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.mentions_analyzed).toBeDefined()
  })

  it('should run email sweep', async () => {
    const res = await fetch('/api/sweeps/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    const data = await res.json()
    expect(data.success).toBe(true)
  })

  it('should run ads sync', async () => {
    const res = await fetch('/api/sweeps/ads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    const data = await res.json()
    expect(data.success).toBe(true)
  })
})

describe('Pipeline APIs', () => {
  it('should check missions', async () => {
    const res = await fetch('/api/pipeline/check')
    const data = await res.json()
    expect(data.due_missions).toBeDefined()
    expect(Array.isArray(data.missions)).toBe(true)
  })

  it('should get pending tasks', async () => {
    const res = await fetch('/api/pipeline/tasks')
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(Array.isArray(data.tasks)).toBe(true)
  })
})

describe('Maintenance APIs', () => {
  it('should run maintenance cleanup', async () => {
    const res = await fetch('/api/maintenance', { method: 'POST' })
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.activity_deleted !== undefined).toBe(true)
  })
})
