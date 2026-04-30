/**
 * Memory Service - Polsia-style with ChromaDB vector search
 * Based on Polsia's app/services/memory_service.py
 */

import { Pool } from 'pg'
import { randomUUID } from 'crypto'
import { getChromaDB, syncMemoriesToChroma, searchMemoriesSemantic } from '../vectordb/chroma'

let pool: Pool | null = null

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.NEON_HOST,
      port: 5432,
      database: process.env.NEON_DB,
      user: process.env.NEON_USER,
      password: process.env.NEON_PASSWORD,
      ssl: true,
    })
  }
  return pool
}

export type MemoryCategory = 'fact' | 'decision' | 'preference' | 'research' | 'result' | 'chat' | 'plan' | 'summary'

export interface MemoryEntry {
  id: string
  company_id: string
  entry_type: MemoryCategory
  title?: string
  content: string
  tags: string[]
  source: string
  related_task_id?: string
  chroma_id?: string
  created_at: Date
}

export interface CreateMemoryInput {
  company_id: string
  entry_type: MemoryCategory
  title?: string
  content: string
  tags?: string[]
  source: string
  related_task_id?: string
}

/**
 * Store memory entry (PostgreSQL + ChromaDB sync)
 */
export async function storeMemory(input: CreateMemoryInput): Promise<MemoryEntry> {
  const db = getPool()
  const id = randomUUID()
  const chromaId = randomUUID()
  
  const result = await db.query(
    `INSERT INTO memory_entries (id, company_id, entry_type, title, content, tags, source, related_task_id, chroma_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
     RETURNING *`,
    [
      id,
      input.company_id,
      input.entry_type,
      input.title || '',
      input.content,
      input.tags || [],
      input.source,
      input.related_task_id || null,
      chromaId,
    ]
  )
  
  // Sync to ChromaDB asynchronously
  const memory: any = result.rows[0]
  const chromaDB = getChromaDB()
  chromaDB.addMemory(memory).catch(e => console.error('ChromaDB sync error:', e))
  
  return result.rows[0]
}

/**
 * Search memories (ChromaDB vector search + PostgreSQL fallback)
 */
export async function searchMemories(
  companyId: string,
  query?: string,
  category?: string,
  limit = 20
): Promise<MemoryEntry[]> {
  const db = getPool()
  
  // If query provided, use semantic search
  if (query) {
    const results = await searchMemoriesSemantic(db, companyId, query, limit)
    if (results.length > 0) {
      // Get full records from PostgreSQL
      const ids = results.map(r => r.id)
      const result = await db.query(
        `SELECT * FROM memory_entries WHERE id = ANY($1)`,
        [ids]
      )
      return result.rows
    }
  }
  
  // Fallback to PostgreSQL search
  let sql = 'SELECT * FROM memory_entries WHERE company_id = $1'
  const params: any[] = [companyId]
  let paramIndex = 2
  
  if (category) {
    sql += ` AND entry_type = $${paramIndex++}`
    params.push(category)
  }
  
  if (query) {
    sql += ` AND (content ILIKE $${paramIndex} OR title ILIKE $${paramIndex})`
    params.push(`%${query}%`)
    paramIndex++
  }
  
  sql += ` ORDER BY created_at DESC LIMIT $${paramIndex}`
  params.push(limit)
  
  const result = await db.query(sql, params)
  return result.rows
}

/**
 * Get memory by type
 */
export async function getMemoriesByType(
  companyId: string,
  entryType: MemoryCategory,
  limit = 20
): Promise<MemoryEntry[]> {
  const db = getPool()
  const result = await db.query(
    `SELECT * FROM memory_entries 
     WHERE company_id = $1 AND entry_type = $2 
     ORDER BY created_at DESC 
     LIMIT $3`,
    [companyId, entryType, limit]
  )
  return result.rows
}

/**
 * Get recent memories
 */
export async function getRecentMemories(
  companyId: string,
  limit = 10
): Promise<MemoryEntry[]> {
  const db = getPool()
  const result = await db.query(
    `SELECT * FROM memory_entries 
     WHERE company_id = $1 
     ORDER BY created_at DESC 
     LIMIT $2`,
    [companyId, limit]
  )
  return result.rows
}

/**
 * Sync all memories to ChromaDB (batch operation)
 */
export async function syncAllToChroma(companyId: string): Promise<{ synced: number }> {
  const db = getPool()
  return syncMemoriesToChroma(db, companyId)
}

/**
 * Delete old memories (maintenance)
 */
export async function cleanupOldMemories(
  companyId: string,
  daysOld = 90
): Promise<number> {
  const db = getPool()
  
  // Delete from ChromaDB first
  const oldMemories = await db.query(
    `SELECT id, chroma_id FROM memory_entries 
     WHERE company_id = $1 
     AND created_at < NOW() - INTERVAL '1 day' * $2
     AND entry_type NOT IN ('fact', 'decision')
     AND chroma_id IS NOT NULL`,
    [companyId, daysOld]
  )
  
  const chromaDB = getChromaDB()
  for (const memory of oldMemories.rows) {
    if (memory.chroma_id) {
      await chromaDB.deleteMemory(companyId, memory.id).catch(e => console.error('ChromaDB delete error:', e))
    }
  }
  
  // Delete from PostgreSQL
  const result = await db.query(
    `DELETE FROM memory_entries 
     WHERE company_id = $1 
     AND created_at < NOW() - INTERVAL '1 day' * $2
     AND entry_type NOT IN ('fact', 'decision')`,
    [companyId, daysOld]
  )
  
  return result.rowCount || 0
}

/**
 * Get context for agent (Polsia-style)
 * Returns recent memories + facts + decisions
 */
export async function getAgentContext(
  companyId: string,
  limit = 20
): Promise<string> {
  const db = getPool()
  
  const result = await db.query(`
    SELECT entry_type, content, created_at 
    FROM memory_entries 
    WHERE company_id = $1 
    AND entry_type IN ('fact', 'decision', 'result', 'plan')
    ORDER BY created_at DESC 
    LIMIT $2
  `, [companyId, limit])
  
  if (!result.rows.length) {
    return 'No context available.'
  }
  
  return result.rows
    .map(r => `[${r.entry_type}] ${r.content}`)
    .join('\n')
}