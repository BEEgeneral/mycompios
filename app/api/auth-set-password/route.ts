// AUTH SET PASSWORD - Set new password from reset token

import { NextResponse } from 'next/server'
import { verifyResetToken, updatePassword, deleteResetSession, createAuthResetSession } from '../../lib/services/auth-reset-service'

export async function POST(req: Request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  }

  if (req.method === 'OPTIONS') {
    return new NextResponse('', { status: 200, headers })
  }

  try {
    const { token, email, password } = await req.json()

    if (!token || !email || !password) {
      return NextResponse.json(
        { error: 'Datos incompletos' },
        { status: 400, headers }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Contraseña muy corta' },
        { status: 400, headers }
      )
    }

    // Find user by email
    const { findUserByEmail } = await import('../../lib/services/auth-reset-service')
    const userId = await findUserByEmail(email)
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404, headers }
      )
    }

    // Verify reset token
    const sessionId = await verifyResetToken(userId, token)
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Token inválido o expirado' },
        { status: 400, headers }
      )
    }

    // Update password
    await updatePassword(userId, password)

    // Delete reset token session
    await deleteResetSession(sessionId)

    // Create new session
    const { token: sessionToken, expiresAt } = await createAuthResetSession(userId)

    const response = NextResponse.json(
      { success: true },
      { status: 200, headers }
    )
    
    response.cookies.set('mc_token', sessionToken, {
      httpOnly: true,
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
      sameSite: 'lax'
    })

    return response

  } catch (err) {
    console.error('Set password error:', err)
    return NextResponse.json(
      { error: err.message },
      { status: 500, headers }
    )
  }
}