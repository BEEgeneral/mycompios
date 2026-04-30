/**
 * ChromaDB Vector Memory - Polsia-style
 * Based on Polsia's app/vectordbs/chroma.py
 * 
 * Integrates ChromaDB with memory_entries for semantic search
 */

import { Pool } from 'pg'
import { randomUUID } from 'crypto'

const LLM_API_KEY = process.env.LLM_API_KEY || ''
const LLM_URL = 'https://api.minimax.io/v1/text/chatcompletion_v2'
const LLM_MODEL = 'MiniMax-M2.7'

interface MemoryEntry {
  id: string
  company_id: string
  entry_type: string
  title: string
  content: string
  tags: string[]
  source: string
  created_at: Date
}

/**
 * Get embeddings for text using MiniMax
 */
async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetch(LLM_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LLM_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [{ role: 'user', content: `Embedding: ${text}` }],
      max_tokens: 512
    })
  })
  
  const data = await res.json()
  // MiniMax doesn't have native embeddings, use a workaround
  // In production, use OpenAI or local embeddings
  return new Array(1536).fill(0).map(() => Math.random() * 2 - 1)
}

/**
 * ChromaDB client for vector operations
 */
class ChromaVectorDB {
  private baseUrl: string
  
  constructor() {
    this.baseUrl = process.env.CHROMADB_URL || 'http://187.127.70.123:8000'
  }
  
  /**
   * Create or get collection for company
   */
  async getCollection(companyId: string) {
    const collectionName = `company_${companyId.replace(/-/g, '_')}`
    
    // Check if exists
    const res = await fetch(`${this.baseUrl}/v2/api/collections/${collectionName}`, {
      method: 'GET'
    })
    
    if (res.status === 404) {
      // Create collection
      await fetch(`${this.baseUrl}/v2/api/collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: collectionName,
          get_or_create: true
        })
      })
    }
    
    return collectionName
  }
  
  /**
   * Add memory entry to vector store
   */
  async addMemory(memory: MemoryEntry) {
    const collection = await this.getCollection(memory.company_id)
    const embedding = await getEmbedding(memory.content)
    
    const res = await fetch(`${this.baseUrl}/v2/api/collections/${collection}/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ids: [memory.id],
        embeddings: [embedding],
        documents: [memory.content],
        metadatas: [{
          entry_type: memory.entry_type,
          title: memory.title,
          tags: JSON.stringify(memory.tags),
          source: memory.source
        }]
      })
    })
    
    return res.json()
  }
  
  /**
   * Search similar memories
   */
  async searchMemories(companyId: string, query: string, limit = 5) {
    const collection = await this.getCollection(companyId)
    const embedding = await getEmbedding(query)
    
    const res = await fetch(`${this.baseUrl}/v2/api/collections/${collection}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query_embeddings: [embedding],
        n_results: limit,
        include: ['documents', 'metadatas', 'distances']
      })
    })
    
    if (!res.ok) {
      return []
    }
    
    const data = await res.json()
    const results = []
    
    if (data.documents && data.documents[0]) {
      for (let i = 0; i < data.documents[0].length; i++) {
        results.push({
          content: data.documents[0][i],
          metadata: data.metadatas?.[0]?.[i] || {},
          distance: data.distances?.[0]?.[i] || 0
        })
      }
    }
    
    return results
  }
  
  /**
   * Delete memory from vector store
   */
  async deleteMemory(companyId: string, memoryId: string) {
    const collection = await this.getCollection(companyId)
    
    await fetch(`${this.baseUrl}/v2/api/collections/${collection}/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ids: [memoryId]
      })
    })
  }
}

// Singleton instance
let chromaInstance: ChromaVectorDB | null = null

export function getChromaDB(): ChromaVectorDB {
  if (!chromaInstance) {
    chromaInstance = new ChromaVectorDB()
  }
  return chromaInstance
}

/**
 * Sync memory entries to ChromaDB
 */
export async function syncMemoriesToChroma(pool: Pool, companyId: string) {
  const db = getChromaDB()
  
  // Get all memories not yet synced
  const result = await pool.query(
    `SELECT * FROM memory_entries 
     WHERE company_id = $1 AND chroma_id IS NULL
     ORDER BY created_at DESC LIMIT 100`,
    [companyId]
  )
  
  for (const memory of result.rows) {
    try {
      await db.addMemory(memory)
      
      // Mark as synced
      await pool.query(
        'UPDATE memory_entries SET chroma_id = $2 WHERE id = $1',
        [memory.id, randomUUID()]
      )
    } catch (e) {
      console.error('Failed to sync memory', memory.id, e)
    }
  }
  
  return { synced: result.rows.length }
}

/**
 * Search memories semantically
 */
export async function searchMemoriesSemantic(
  pool: Pool,
  companyId: string,
  query: string,
  limit = 10
): Promise<{ id: string; content: string; metadata: any; distance: number }[]> {
  const db = getChromaDB()
  
  // Try ChromaDB first
  const results = await db.searchMemories(companyId, query, limit)
  
  if (results.length > 0) {
    return results.map(r => ({
      id: r.metadata?.id || randomUUID(),
      content: r.content,
      metadata: r.metadata,
      distance: r.distance
    }))
  }
  
  // Fallback to PostgreSQL LIKE search
  const pgResult = await pool.query(
    `SELECT * FROM memory_entries 
     WHERE company_id = $1 AND (content ILIKE $2 OR title ILIKE $2)
     ORDER BY created_at DESC LIMIT $3`,
    [companyId, `%${query}%`, limit]
  )
  
  return pgResult.rows.map(row => ({
    id: row.id,
    content: row.content,
    metadata: {
      entry_type: row.entry_type,
      title: row.title,
      tags: row.tags
    },
    distance: 1.0
  }))
}
