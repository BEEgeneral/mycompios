// STRIPE WEBHOOK - Handle Stripe events

import { handleWebhook } from '../../lib/services/stripe-service'

export async function POST(req: Request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  }

  try {
    const body = await req.text()
    const sig = req.headers.get('stripe-signature')

    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
      return new Response(JSON.stringify({ error: 'Stripe not configured' }), { status: 500, headers })
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

    let event
    try {
      event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
    } catch (err) {
      console.error('Webhook signature error:', err.message)
      return new Response('Webhook signature error', { status: 400, headers })
    }

    const result = await handleWebhook(event)

    return new Response(JSON.stringify({ received: true, ...result }), { status: 200, headers })

  } catch (err) {
    console.error('Webhook error:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers })
  }
}