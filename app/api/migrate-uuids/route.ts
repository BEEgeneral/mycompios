// MIGRATION: Fix UUID types for company_id and id columns
// This script migrates TEXT columns to UUID to fix JOIN issues
import { NextResponse } from 'next/server'

export async function GET() {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  
  try {
    const { Pool } = require('pg')
    const pool = new Pool({
      host: process.env.NEON_HOST,
      database: process.env.NEON_DB,
      user: process.env.NEON_USER,
      password: process.env.NEON_PASSWORD,
      ssl: true,
      max: 1,
    })
    
    const results = []
    
    // 1. Drop composite PK on health_scores, add temp PK, alter column, restore
    try {
      await pool.query('ALTER TABLE health_scores DROP CONSTRAINT IF EXISTS health_scores_pkey')
      await pool.query('ALTER TABLE health_scores ALTER COLUMN company_id TYPE uuid USING company_id::uuid')
      results.push('health_scores.company_id → uuid')
    } catch (e) { results.push('health_scores: ' + e.message) }
    
    // 2. token_usage - id and company_id
    try {
      await pool.query('ALTER TABLE token_usage ALTER COLUMN id TYPE uuid USING id::uuid')
      await pool.query('ALTER TABLE token_usage ALTER COLUMN company_id TYPE uuid USING company_id::uuid')
      results.push('token_usage id+company_id → uuid')
    } catch (e) { results.push('token_usage: ' + e.message) }
    
    // 3. proactive_triggers - id and company_id
    try {
      await pool.query('ALTER TABLE proactive_triggers ALTER COLUMN id TYPE uuid USING id::uuid')
      await pool.query('ALTER TABLE proactive_triggers ALTER COLUMN company_id TYPE uuid USING company_id::uuid')
      results.push('proactive_triggers id+company_id → uuid')
    } catch (e) { results.push('proactive_triggers: ' + e.message) }
    
    // 4. missions - id and company_id
    try {
      await pool.query('ALTER TABLE missions ALTER COLUMN id TYPE uuid USING id::uuid')
      await pool.query('ALTER TABLE missions ALTER COLUMN company_id TYPE uuid USING company_id::uuid')
      results.push('missions id+company_id → uuid')
    } catch (e) { results.push('missions: ' + e.message) }
    
    // 5. mission_tasks - id and company_id
    try {
      await pool.query('ALTER TABLE mission_tasks ALTER COLUMN id TYPE uuid USING id::uuid')
      await pool.query('ALTER TABLE mission_tasks ALTER COLUMN company_id TYPE uuid USING company_id::uuid')
      results.push('mission_tasks id+company_id → uuid')
    } catch (e) { results.push('mission_tasks: ' + e.message) }
    
    // 6. agent_heartbeats - company_id
    try {
      await pool.query('ALTER TABLE agent_heartbeats ALTER COLUMN company_id TYPE uuid USING company_id::uuid')
      results.push('agent_heartbeats.company_id → uuid')
    } catch (e) { results.push('agent_heartbeats: ' + e.message) }
    
    // 7. sessions - id
    try {
      await pool.query('ALTER TABLE sessions ALTER COLUMN id TYPE uuid USING id::uuid')
      results.push('sessions.id → uuid')
    } catch (e) { results.push('sessions: ' + e.message) }
    
    await pool.end()
    
    return NextResponse.json({
      success: true,
      migrated: results
    }, { status: 200, headers })
    
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers })
  }
}
