// AUTH RESET PASSWORD - Request password reset

import { NextResponse } from 'next/server'
import { findUserByEmail, createResetToken } from '../../lib/services/auth-reset-service'

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
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email requerido' },
        { status: 400, headers }
      )
    }

    const userId = await findUserByEmail(email)
    
    if (!userId) {
      // Don't reveal if email exists
      return NextResponse.json({
        success: true,
        message: 'Si el email existe, recibirás un enlace para restablecer tu contraseña'
      }, { status: 200, headers })
    }

    const resetToken = await createResetToken(userId)

    // In production, send email with reset link
    // For now, return token in response (mock)
    console.log('Reset token for', email, ':', resetToken)

    return NextResponse.json({
      success: true,
      message: 'Si el email existe, recibirás un enlace para restablecer tu contraseña'
      // reset_url would be sent via email in production
    }, { status: 200, headers })

  } catch (err) {
    console.error('Reset password error:', err)
    return NextResponse.json(
      { error: 'Error interno' },
      { status: 500, headers }
    )
  }
}