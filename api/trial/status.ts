// MyCompi Trial Status
// Migrated from InsForge (Deno) to Vercel (Node.js)

import { NextResponse } from 'next/server'
import { query } from '../_lib/db'

export async function GET(req: Request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  }

  if (req.method === 'OPTIONS') {
    return new NextResponse('', { status: 204, headers })
  }

  try {
    // Get user from token/header
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { error: 'Token requerido', code: 'NO_TOKEN' },
        { status: 401, headers }
      )
    }

    // Extract userId from token (format: randomhex_userId)
    const userId = token.split('_').pop()
    if (!userId) {
      return NextResponse.json(
        { error: 'Token inválido', code: 'INVALID_TOKEN' },
        { status: 401, headers }
      )
    }

    // Get user email
    const users = await query(
      'SELECT email, name, company FROM app_user WHERE id = $1',
      [userId]
    )

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado', code: 'USER_NOT_FOUND' },
        { status: 404, headers }
      )
    }

    const user = users[0]

    // Get company/trial info
    const companies = await query(
      'SELECT id, name, plan, trial_expires_at, api_key FROM companies WHERE LOWER(email) = LOWER($1)',
      [user.email]
    )

    const company = companies.length > 0 ? companies[0] : null
    const now = new Date()
    let trialExpired = false
    let trialDaysLeft = 0
    let trialHoursLeft = 0

    if (company && company.plan === 'trial' && company.trial_expires_at) {
      const expiresAt = new Date(company.trial_expires_at)
      const diffMs = expiresAt.getTime() - now.getTime()

      if (diffMs <= 0) {
        trialExpired = true
        trialDaysLeft = 0
        trialHoursLeft = 0
      } else {
        trialDaysLeft = Math.floor(diffMs / (24 * 60 * 60 * 1000))
        trialHoursLeft = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
      }
    }

    return NextResponse.json({
      success: true,
      user_id: userId,
      user_email: user.email,
      company_id: company?.id || null,
      company_name: company?.name || user.company,
      plan: company?.plan || 'trial',
      has_trial: company?.plan === 'trial',
      trial_expires_at: company?.trial_expires_at || null,
      trial_expired: trialExpired,
      trial_days_left: trialDaysLeft,
      trial_hours_left: trialHoursLeft,
      messages_used_today: 0,
      messages_limit: null,
      trial_pause_used: false,
      trial_paused_at: null
    }, { status: 200, headers })

  } catch (err) {
    console.error('Trial status error:', err)
    return NextResponse.json(
      { error: (err as Error).message, code: 'INTERNAL_ERROR' },
      { status: 500, headers }
    )
  }
}