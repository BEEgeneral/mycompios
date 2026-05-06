// app/api/integrations/composio/callback/route.ts
// OAuth callback handler for Composio integration connects

import { NextResponse } from 'next/server'

const COMPOSIO_BASE = 'https://gum.composio.ai'

async function getPool() {
  const { Pool } = require('pg')
  return new Pool({
    host: process.env.NEON_HOST, port: 5432,
    database: process.env.NEON_DB, user: process.env.NEON_USER,
    password: process.env.NEON_PASSWORD, ssl: true, max: 2,
  })
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state') // format: "userId:service"
  const error = url.searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (error) {
    return NextResponse.redirect(`${appUrl}/dashboard/settings/integrations?error=${encodeURIComponent(error)}`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/dashboard/settings/integrations?error=missing_params`)
  }

  const [userId, service] = state.split(':')
  if (!userId || !service) {
    return NextResponse.redirect(`${appUrl}/dashboard/settings/integrations?error=invalid_state`)
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch(`${COMPOSIO_BASE}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.COMPOSIO_CLIENT_ID,
        client_secret: process.env.COMPOSIO_CLIENT_SECRET,
        redirect_uri: `${appUrl}/api/integrations/composio/callback`
      })
    })

    if (!tokenRes.ok) {
      return NextResponse.redirect(`${appUrl}/dashboard/settings/integrations?error=token_exchange_failed`)
    }

    const tokens = await tokenRes.json()
    const expiresAt = tokens.expires_at ? new Date(tokens.expires_at).toISOString() : null

    // Persist integration
    const pool = await getPool()
    try {
      await pool.query(
        `INSERT INTO integrations (id, user_id, service, access_token, refresh_token, expires_at, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (user_id, service) DO UPDATE SET
           access_token = EXCLUDED.access_token,
           refresh_token = EXCLUDED.refresh_token,
           expires_at = EXCLUDED.expires_at,
           metadata = EXCLUDED.metadata`,
        [
          require('crypto').randomUUID(),
          userId,
          service,
          tokens.access_token,
          tokens.refresh_token || null,
          expiresAt,
          JSON.stringify(tokens.metadata || {})
        ]
      )
    } finally {
      await pool.end()
    }

    return NextResponse.redirect(`${appUrl}/dashboard/settings/integrations?connected=${service}`)
  } catch (e: any) {
    return NextResponse.redirect(`${appUrl}/dashboard/settings/integrations?error=${encodeURIComponent(e.message)}`)
  }
}
