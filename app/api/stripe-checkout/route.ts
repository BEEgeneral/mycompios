// STRIPE CHECKOUT - Create checkout session with plan selection

import { NextResponse } from 'next/server'
import { getUserBySessionToken, getCompanyById, createCheckoutSession } from '../../lib/services/stripe-service'

export async function POST(req: Request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    const session = await getUserBySessionToken(token)
    if (!session) {
      return NextResponse.json({ error: 'Sesion invalida' }, { status: 401, headers })
    }

    const company = await getCompanyById(session.company_id)
    if (!company) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404, headers })
    }

    // Use real Stripe if available, otherwise mock
    let result
    if (process.env.STRIPE_SECRET_KEY) {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
      const body = await req.json()
      const { priceId } = body

      const checkoutSession = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price: priceId || 'price_1TMWMHFnOlGTfuoBIKY9H2P7',
          quantity: 1,
        }],
        mode: 'subscription',
        success_url: 'https://mycompios.vercel.app/dashboard?upgrade=success',
        cancel_url: 'https://mycompios.vercel.app/dashboard?upgrade=cancelled',
        metadata: { company_id: company.id },
      })

      result = { sessionId: checkoutSession.id, url: checkoutSession.url }
    } else {
      result = await createCheckoutSession('cus_mock', 'price_mock', 'https://mycompi.com/dashboard?success', 'https://mycompi.com/dashboard?cancel')
    }

    return NextResponse.json({ success: true, ...result }, { status: 200, headers })

  } catch (err) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers })
  }
}