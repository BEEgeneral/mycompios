/**
 * User Status API - Get current user with company info
 * GET /api/user-status
 * Uses user-service.ts (Polsia-style services layer)
 */

import { NextResponse } from 'next/server'
import { getUserByToken, getUserWithCompany } from '../../lib/services/user-service'

export async function GET(req: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  
  try {
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 401, headers })
    }

    const userId = await getUserByToken(token)
    
    if (!userId) {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401, headers })
    }

    const user = await getUserWithCompany(userId)
    
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404, headers })
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        company_id: user.company_id,
        company_name: user.company_name,
        plan: user.plan || 'starter',
        mission_statement: user.mission_statement,
        current_phase: user.current_phase || 0,
        credits_remaining: (user.credits_total || 5) - (user.credits_used || 0),
        autonomy_mode: user.autonomy_mode || 'manual',
        onboarding_status: user.onboarding_status || 'pending'
      }
    }, { status: 200, headers })

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500, headers })
  }
}