// STRIPE WEBHOOK - Handle Stripe events

export async function POST(req) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  }

  try {
    const body = await req.text()
    const sig = req.headers.get('stripe-signature')

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

    let event
    try {
      event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
    } catch (err) {
      console.error('Webhook signature error:', err.message)
      return new Response('Webhook signature error', { status: 400, headers })
    }

    const { Pool } = require('pg')
    const pool = new Pool({
      host: process.env.NEON_HOST,
      port: 5432,
      database: process.env.NEON_DB,
      user: process.env.NEON_USER,
      password: process.env.NEON_PASSWORD,
      ssl: { rejectUnauthorized: false },
      max: 1,
    })

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const companyId = session.metadata?.company_id
        
        if (companyId && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription)
          
          await pool.query(
            'UPDATE companies SET plan = $1, stripe_subscription_id = $2, stripe_customer_id = $3 WHERE id = $4',
            ['pro', subscription.id, session.customer, companyId]
          )
          
          await pool.query(
            'UPDATE trial_status SET has_trial = false, trial_converted = true, converted_at = NOW() WHERE company_id = $1',
            [companyId]
          )
          
          console.log('Company upgraded:', companyId)
        }
        break
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        await pool.query(
          'UPDATE companies SET plan = cancelled WHERE stripe_customer_id = $1',
          [subscription.customer]
        )
        break
      }
    }

    await pool.end()
    return new Response(JSON.stringify({ received: true }), { status: 200, headers })

  } catch (err) {
    console.error('Webhook error:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers })
  }
}
