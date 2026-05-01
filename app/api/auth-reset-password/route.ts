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
      // Don't reveal if email exists - still return success
      return NextResponse.json({
        success: true,
        message: 'Si el email existe, recibirás un enlace para restablecer tu contraseña'
      }, { status: 200, headers })
    }

    const resetToken = await createResetToken(userId)

    // Send real email via Resend
    await sendResetEmail(email, resetToken).catch(e => {
      console.log('Reset email error:', e.message)
    })

    return NextResponse.json({
      success: true,
      message: 'Si el email existe, recibirás un enlace para restablecer tu contraseña'
    }, { status: 200, headers })

  } catch (err) {
    console.error('Reset password error:', err)
    return NextResponse.json(
      { error: 'Error interno' },
      { status: 500, headers }
    )
  }
}

async function sendResetEmail(email: string, token: string) {
  const resetUrl = `https://mycompi.com/reset-password?token=${token}&email=${encodeURIComponent(email)}`
  
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Restablecer contraseña - MyCompi</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Poppins',Segoe UI,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    <div style="background:#2D3261;padding:32px 40px;">
      <div style="color:#FFD154;font-size:22px;font-weight:700;">Restablece tu contraseña</div>
    </div>
    <div style="padding:36px 40px;">
      <p style="font-size:17px;color:#333;">Hola,</p>
      <p style="font-size:16px;color:#444;line-height:1.7;">Recibimos una solicitud para restablecer la contraseña de tu cuenta MyCompi.</p>
      <p style="font-size:16px;color:#444;line-height:1.7;">Si no solicitaste este cambio, puedes ignorar este email.</p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${resetUrl}" style="display:inline-block;background:#FFD054;color:#2D3261;font-weight:700;padding:14px 32px;border-radius:9999px;text-decoration:none;font-size:15px;">Restablecer contraseña</a>
      </div>
      <p style="font-size:13px;color:#999;margin-top:20px;">O copia este enlace: ${resetUrl}</p>
      <p style="font-size:12px;color:#ccc;margin-top:30px;">Este enlace expira en 1 hora.</p>
    </div>
    <div style="background:#f8f8f8;padding:20px 40px;text-align:center;">
      <p style="color:#999;font-size:12px;margin:0;">MyCompi - 49€/mes - Sin permanencia</p>
    </div>
  </div>
</body>
</html>
`

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    console.log('RESEND_API_KEY not configured, skipping email')
    return
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${resendKey}`
    },
    body: JSON.stringify({
      from: 'MyCompi <onboarding@resend.dev>',
      to: [email],
      subject: 'Restablece tu contraseña - MyCompi',
      html
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Resend error: ${error}`)
  }

  const data = await response.json()
  console.log('Reset email sent:', data.id)
}