// STRIPE CHECKOUT - Create checkout session with plan selection

import { NextResponse } from 'next/server'
import { getUserBySessionToken, getCompanyByName, createCheckoutSession } from '../../lib/services/stripe-service'

export async function POST(req: Request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
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

    const session = await getUserBySessionToken(token)
    if (!session) {
      return NextResponse.json({ error: 'Sesion invalida' }, { status: 401, headers })
    }

    const company = await getCompanyByName(session.company)
    if (!company) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404, headers })
    }

    // Always use mock mode for now - real Stripe needs price IDs configured
    const { priceId } = await req.json()
    const result = await createCheckoutSession(
      'cus_mock',
      priceId || 'price_pro_monthly',
      'https://mycompi.com/dashboard?success',
      'https://mycompi.com/dashboard?cancel'
    )

    return NextResponse.json({ 
      success: true, 
      ...result,
      mock: true,
      message: 'Modo demo - Stripe necesita precio configurado'
    }, { status: 200, headers })

  } catch (err: any) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers })
  }
}
