// STRIPE CHECKOUT - Create checkout session with plan selection

import { NextResponse } from 'next/server'
import { getUserBySessionToken, getCompanyById, getCompanyByName, createCheckoutSession } from '../../lib/services/stripe-service'

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

    console.log('DEBUG: session result:', session)
    console.log('DEBUG: looking for company:', session.company)

    const company = await getCompanyByName(session.company)
    console.log('DEBUG: company result:', company)
    
    if (!company) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404, headers })
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY
    const { priceId } = await req.json()

    // Determine price based on plan
    const plans: Record<string, string> = {
      pro: priceId || process.env.STRIPE_PRICE_PRO || 'price_pro_monthly',
      autonomous: priceId || process.env.STRIPE_PRICE_AUTONOMOUS || 'price_autonomous_monthly'
    }

    const selectedPrice = plans[company.plan as string] || plans.pro

    let result: { sessionId: string; url: string }

    if (stripeKey && stripeKey !== 'mock') {
      // Real Stripe mode
      const stripe = require('stripe')(stripeKey)

      const checkoutSession = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price: selectedPrice,
          quantity: 1,
        }],
        mode: 'subscription',
        success_url: 'https://mycompi.com/dashboard?upgrade=success',
        cancel_url: 'https://mycompi.com/dashboard?upgrade=cancelled',
        metadata: {
          company_id: company.id,
          company_name: company.name
        },
        customer_email: company.email,
      })

      result = { sessionId: checkoutSession.id, url: checkoutSession.url ?? '' }
    } else {
      // Mock mode for development
      if (!stripeKey) {
        console.log('STRIPE_SECRET_KEY not configured - using mock mode')
      }
      result = await createCheckoutSession('cus_mock', selectedPrice, 'https://mycompi.com/dashboard?success', 'https://mycompi.com/dashboard?cancel')
    }

    return NextResponse.json({ success: true, ...result }, { status: 200, headers })

  } catch (err) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers })
  }
}