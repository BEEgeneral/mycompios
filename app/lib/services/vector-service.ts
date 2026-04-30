/**
 * ChromaDB Service - Vector memory for MyCompi
 * 
 * Based on Polsia's app/services/vector_store.py
 * ChromaDB: http://187.127.70.123:8000
 */

import { ChromaClient, Collection } from 'chromadb'

const CHROMA_URL = process.env.CHROMA_URL || 'http://187.127.70.123:8000'

let client: ChromaClient | null = null

/**
 * Get or create Chroma client
 */
export function getChromaClient(): ChromaClient {
  if (!client) {
    client = new ChromaClient({ path: CHROMA_URL })
  }
  return client
}

export interface MemoryEmbedding {
  id: string
  content: string
  company_id: string
  agent_type?: string
  entry_type?: string
  metadata?: Record<string, any>
}

/**
 * Get or create collection for a company
 */
export async function getCollection(companyId: string): Promise<Collection> {
  const chroma = getChromaClient()
  const collectionName = `company_${companyId}`
  
  try {
    return await chroma.getOrCreateCollection({ name: collectionName })
  } catch {
    return await chroma.createCollection({ name: collectionName })
  }
}

/**
 * Store memory in vector DB
 */
export async function storeEmbedding(
  companyId: string,
  content: string,
  metadata: {
    agent_type?: string
    entry_type?: string
    task_id?: string
    tags?: string[]
  }
): Promise<string> {
  const collection = await getCollection(companyId)
  const id = crypto.randomUUID()
  
  await collection.add({
    ids: [id],
    documents: [content],
    metadatas: [metadata]
  })
  
  return id
}

/**
 * Search similar memories (semantic search)
 */
export async function searchSimilar(
  companyId: string,
  query: string,
  limit = 5
): Promise<Array<{ id: string; content: string; distance: number; metadata: any }>> {
  const collection = await getCollection(companyId)
  
  const results = await collection.query({
    queryTexts: [query],
    nResults: limit,
  })
  
  return results.documents[0]?.map((doc, i) => ({
    id: results.ids[0][i],
    content: doc,
    distance: results.distances?.[0]?.[i] || 0,
    metadata: results.metadatas?.[0]?.[i] || {},
  })) || []
}

/**
 * Delete old embeddings
 */
export async function deleteOldEmbeddings(
  companyId: string,
  daysOld = 90
): Promise<number> {
  // Chroma doesn't support delete by date, so we handle this at application level
  // For now, we just log the cleanup
  console.log(`[ChromaDB] Would cleanup embeddings older than ${daysOld} days`)
  return 0
}

/**
 * Get collection stats
 */
export async function getCollectionStats(companyId: string): Promise<{
  count: number
  name: string
}> {
  const collection = await getCollection(companyId)
  return {
    count: await collection.count(),
    name: collection.name,
  }
}