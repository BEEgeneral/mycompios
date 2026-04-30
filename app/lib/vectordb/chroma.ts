/**
 * ChromaDB Vector Memory - Polsia-style
 * Based on Polsia's app/vectordbs/chroma.py
 * 
 * Integrates ChromaDB with memory_entries for semantic search
 * Uses Ollama nomic-embed-text for embeddings
 */

import { Pool } from 'pg'
import { randomUUID } from 'crypto'

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://187.127.70.123:11434'
const CHROMADB_URL = process.env.CHROMADB_URL || 'http://187.127.70.123:8000'

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
 * Get embeddings for text using Ollama nomic-embed-text
 */
async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'nomic-embed-text:latest',
      prompt: text
    })
  })
  
  if (!res.ok) {
    throw new Error(`Ollama embedding failed: ${res.status}`)
  }
  
  const data = await res.json()
  return data.embedding
}

/**
 * ChromaDB client for vector operations
 */
class ChromaVectorDB {
  private baseUrl: string
  
  constructor() {
    this.baseUrl = CHROMADB_URL
  }
  
  /**
   * Create or get collection for company
   */
  async getCollection(companyId: string): Promise<string> {
    const collectionName = `company_${companyId.replace(/-/g, '_')}`
    
    try {
      const res = await fetch(`${this.baseUrl}/v2/api/collections/${collectionName}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (res.status === 404) {
        await fetch(`${this.baseUrl}/v2/api/collections`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: collectionName,
            get_or_create: true
          })
        })
      }
    } catch (e) {
      console.error('ChromaDB collection error:', e)
    }
    
    return collectionName
  }
  
  /**
   * Add memory entry to vector store
   */
  async addMemory(memory: MemoryEntry): Promise<void> {
    const collection = await this.getCollection(memory.company_id)
    const embedding = await getEmbedding(memory.content)
    
    try {
      await fetch(`${this.baseUrl}/v2/api/collections/${collection}/add`, {
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
    } catch (e) {
      console.error('ChromaDB add error:', e)
    }
  }
  
  /**
   * Search similar memories
   */
  async searchMemories(companyId: string, query: string, limit = 5): Promise<any[]> {
    const collection = await this.getCollection(companyId)
    const embedding = await getEmbedding(query)
    
    try {
      const res = await fetch(`${this.baseUrl}/v2/api/collections/${collection}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query_embeddings: [embedding],
          n_results: limit,
          include: ['documents', 'metadatas', 'distances']
        })
      })
      
      if (!res.ok) return []
      
      const data = await res.json()
      const results = []
      
      if (data.documents?.[0]) {
        for (let i = 0; i < data.documents[0].length; i++) {
          results.push({
            content: data.documents[0][i],
            metadata: data.metadatas?.[0]?.[i] || {},
            distance: data.distances?.[0]?.[i] || 0
          })
        }
      }
      
      return results
    } catch (e) {
      console.error('ChromaDB search error:', e)
      return []
    }
  }
  
  /**
   * Delete memory from vector store
   */
  async deleteMemory(companyId: string, memoryId: string): Promise<void> {
    const collection = await this.getCollection(companyId)
    
    try {
      await fetch(`${this.baseUrl}/v2/api/collections/${collection}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [memoryId] })
      })
    } catch (e) {
      console.error('ChromaDB delete error:', e)
    }
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
export async function syncMemoriesToChroma(pool: Pool, companyId: string): Promise<{ synced: number }> {
  const db = getChromaDB()
  let synced = 0
  
  try {
    const result = await pool.query(
      `SELECT * FROM memory_entries 
       WHERE company_id = $1 AND chroma_id IS NULL
       ORDER BY created_at DESC LIMIT 100`,
      [companyId]
    )
    
    for (const memory of result.rows) {
      try {
        await db.addMemory(memory)
        
        await pool.query(
          'UPDATE memory_entries SET chroma_id = $2 WHERE id = $1',
          [memory.id, randomUUID()]
        )
        synced++
      } catch (e) {
        console.error('Sync memory failed:', memory.id, e)
      }
    }
  } catch (e) {
    console.error('Sync error:', e)
  }
  
  return { synced }
}

/**
 * Search memories semantically (Polsia-style)
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
  const result = await pool.query(
    `SELECT * FROM memory_entries 
     WHERE company_id = $1 AND (content ILIKE $2 OR title ILIKE $2)
     ORDER BY created_at DESC LIMIT $3`,
    [companyId, `%${query}%`, limit]
  )
  
  return result.rows.map(row => ({
    id: row.id,
    content: row.content,
    metadata: { entry_type: row.entry_type, title: row.title, tags: row.tags },
    distance: 1.0
  }))
}

/**
 * Store new memory in both PostgreSQL and ChromaDB
 */
export async function storeMemory(
  pool: Pool,
  companyId: string,
  entryType: string,
  content: string,
  tags: string[],
  source: string
): Promise<string> {
  const id = randomUUID()
  
  // Store in PostgreSQL
  await pool.query(
    `INSERT INTO memory_entries (id, company_id, entry_type, content, tags, source)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, companyId, entryType, content, tags, source]
  )
  
  // Sync to ChromaDB
  const memory: MemoryEntry = {
    id,
    company_id: companyId,
    entry_type: entryType,
    title: '',
    content,
    tags,
    source,
    created_at: new Date()
  }
  
  try {
    const db = getChromaDB()
    await db.addMemory(memory)
    await pool.query('UPDATE memory_entries SET chroma_id = $2 WHERE id = $1', [id, randomUUID()])
  } catch (e) {
    console.error('ChromaDB sync failed:', e)
  }
  
  return id
}