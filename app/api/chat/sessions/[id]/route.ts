// DELETE /api/chat/sessions/[id] - Delete a chat session
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

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  }

  if (req.method === 'OPTIONS') {
    return new NextResponse('', { status: 200, headers })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    const sessionId = params.id

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

    // Get company_id
    const userResult = await pool.query(
      'SELECT company_id FROM app_user WHERE id = $1',
      [userId]
    )
    const companyId = userResult.rows[0]?.company_id

    if (!companyId) {
      await pool.end()
      return NextResponse.json({ error: 'Usuario sin empresa' }, { status: 400, headers })
    }

    // Delete the session
    await pool.query(
      `DELETE FROM memory_entries 
       WHERE company_id = $1 AND entry_type = 'chat_session' AND content->>'sessionId' = $2`,
      [companyId, sessionId]
    )

    await pool.end()

    return NextResponse.json({ success: true }, { status: 200, headers })

  } catch (err) {
    console.error('Delete session error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers })
  }
}
