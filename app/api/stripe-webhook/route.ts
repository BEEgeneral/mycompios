// Stripe Webhook Handler

import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  }

  try {
    const event = await req.json()
    console.log('Stripe webhook event:', event.type)

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        console.log('Checkout completed:', event.data.object)
        break
      case 'customer.subscription.updated':
        console.log('Subscription updated:', event.data.object)
        break
      case 'customer.subscription.deleted':
        console.log('Subscription deleted:', event.data.object)
        break
      default:
        console.log('Unhandled event type:', event.type)
    }

    return NextResponse.json({ received: true }, { headers })
  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json({ error: err.message }, { status: 400, headers })
  }
}
