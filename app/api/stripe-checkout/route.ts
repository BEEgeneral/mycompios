// STRIPE CHECKOUT - Create checkout session with plan selection

import { NextResponse } from 'next/server'
import { getUserBySessionToken, getCompanyByName, createCheckoutSession } from '../../lib/services/stripe-service'

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

    // Step 1: getUserBySessionToken
    let session
    try {
      session = await getUserBySessionToken(token)
      console.log('STEP1 session:', session ? 'got session' : 'null')
    } catch (e: any) {
      console.error('STEP1 error:', e.message)
      return NextResponse.json({ success: false, error: 'STEP1: ' + e.message }, { status: 500, headers })
    }
    
    if (!session) {
      return NextResponse.json({ error: 'Sesion invalida' }, { status: 401, headers })
    }

    // Step 2: getCompanyByName  
    let company
    try {
      company = await getCompanyByName(session.company)
      console.log('STEP2 company:', company ? 'got company' : 'null')
    } catch (e: any) {
      console.error('STEP2 error:', e.message)
      return NextResponse.json({ success: false, error: 'STEP2: ' + e.message }, { status: 500, headers })
    }
    
    if (!company) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404, headers })
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY
    const { priceId } = await req.json()

    const plans: Record<string, string> = {
      pro: priceId || process.env.STRIPE_PRICE_PRO || 'price_pro_monthly',
      autonomous: priceId || process.env.STRIPE_PRICE_AUTONOMOUS || 'price_autonomous_monthly'
    }

    const selectedPrice = plans[company.plan as string] || plans.pro

    let result: { sessionId: string; url: string }

    if (stripeKey && stripeKey !== 'mock') {
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
      result = await createCheckoutSession('cus_mock', selectedPrice, 'https://mycompi.com/dashboard?success', 'https://mycompi.com/dashboard?cancel')
    }

    return NextResponse.json({ success: true, ...result }, { status: 200, headers })

  } catch (err: any) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers })
  }
}
