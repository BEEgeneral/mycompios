// GET /api/chat/sessions - List chat sessions for current user
import { NextResponse } from 'next/server'

function getDbPool() {
  const { Pool } = require('pg')
  return new Pool({
    host: process.env.NEON_HOST,
    database: process.env.NEON_DB,
    user: process.env.NEON_USER,
    password: process.env.NEON_PASSWORD,
    ssl: true,
    max: 1,
  })
}

export async function GET(req) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  }

  if (req.method === 'OPTIONS') {
    return new NextResponse('', { status: 200, headers })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 401, headers })
    }

    const pool = getDbPool()

    // Get user from session (sessions.id IS the token)
    const sessionResult = await pool.query(
      'SELECT user_id FROM sessions WHERE id = $1 AND expires_at > NOW()',
      [token]
    )

    if (sessionResult.rows.length === 0) {
      await pool.end()
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401, headers })
    }

    const userId = sessionResult.rows[0].user_id

    // Get sessions from memory_entries where entry_type = 'chat_session'
    const sessionsResult = await pool.query(`
      SELECT DISTINCT ON (content->>'sessionId') 
        content->>'sessionId' as id,
        content->>'title' as title,
        content->>'agentId' as "agentId",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM memory_entries 
      WHERE company_id = (
        SELECT company_id FROM app_user WHERE id = $1
      ) AND entry_type = 'chat_session'
      ORDER BY content->>'sessionId', updated_at DESC
    `, [userId])

    const sessions = sessionsResult.rows.map(row => ({
      id: row.id,
      title: row.title || 'Nueva conversación',
      agentId: row.agentId || 'paco',
      createdAt: new Date(row.createdAt).getTime(),
      updatedAt: new Date(row.updatedAt).getTime()
    }))

    // Sort by updatedAt descending
    sessions.sort((a, b) => b.updatedAt - a.updatedAt)

    await pool.end()

    return NextResponse.json({ sessions }, { status: 200, headers })

  } catch (err) {
    console.error('Sessions error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers })
  }
}
