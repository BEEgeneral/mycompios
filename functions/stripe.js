// Stripe Edge Function for MyCompi
// Handles: checkout sessions, webhooks, customer portal, subscriptions

const STRIPE_PUBLISHABLE_KEY = 'pk_live_51TEVyhFnOlGTfuoBIITpQip0Gn56XIQwPJNTe3OJ7kGE42lY0S59kqLWc3Zvq6RB0ISOFEqhEonbhgL7uRFsQGEp00'

const PLANS = {
  profesional: { 
    priceIdMonthly: 'price_profesional_monthly', 
    priceIdYearly: 'price_1TQQZ9FnOlGTfuoB3hJtBlWS',
    name: 'Profesional', 
    amountMonthly: 4900, 
    amountYearly: 39000,
    interval: 'month' 
  }
}

interface CheckoutRequest {
  plan: keyof typeof PLANS
  billing: 'month' | 'year'
  email: string
  successUrl: string
  cancelUrl: string
}

async function stripeFetch(endpoint: string, options: RequestInit = {}) {
  const res = await fetch(`https://api.stripe.com/v1${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...options.headers
    }
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || 'Stripe API error')
  return data
}

export default async function(req: Request): Promise<Response> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers })
  }

  try {
    const url = new URL(req.url)
    const path = url.pathname.split('/').pop()

    if (req.method === 'GET') {
      if (path === 'config') {
        return new Response(JSON.stringify({
          publishableKey: STRIPE_PUBLISHABLE_KEY,
          plans: Object.entries(PLANS).reduce((acc, [key, val]) => {
            acc[key] = { 
              name: val.name, 
              amountMonthly: val.amountMonthly, 
              amountYearly: val.amountYearly,
              interval: val.interval,
              priceIdMonthly: val.priceIdMonthly,
              priceIdYearly: val.priceIdYearly
            }
            return acc
          }, {} as any)
        }), { headers })
      }
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers })
    }

    if (req.method === 'POST') {
      const body = JSON.parse(await req.text())
      const { action } = body

      switch (action) {
        case 'create_checkout': {
          const { plan, billing, email, successUrl, cancelUrl } = body as CheckoutRequest
          const planData = PLANS[plan]
          if (!planData) return new Response(JSON.stringify({ error: 'Invalid plan' }), { status: 400, headers })
          
          const priceId = billing === 'year' ? planData.priceIdYearly : planData.priceIdMonthly
          const amount = billing === 'year' ? planData.amountYearly : planData.amountMonthly
          const successBase = successUrl || 'https://guuimyx3.insforge.site/panel?checkout=success'
          const cancelBase = cancelUrl || 'https://guuimyx3.insforge.site/precios?checkout=cancelled'
          
          const session = await stripeFetch('/checkout/sessions', {
            method: 'POST',
            body: new URLSearchParams({
              'mode': 'subscription',
              'payment_method_types[]': 'card',
              'line_items[0][price]': priceId,
              'line_items[0][quantity]': '1',
              'customer_email': email,
              'success_url': `${successBase}&plan=${plan}&billing=${billing}`,
              'cancel_url': `${cancelBase}&plan=${plan}`,
              'allow_promotion_codes': 'true',
              'billing_address_collection': 'auto',
              'subscription_data[metadata][plan]': plan,
              'subscription_data[metadata][billing]': billing
            })
          })

          return new Response(JSON.stringify({
            success: true,
            sessionId: session.id,
            url: session.url,
            plan,
            billing,
            amount,
            intervalLabel: billing === 'year' ? 'año' : 'mes'
          }), { headers })
        }

        case 'create_customer': {
          const { email, name } = body
          const customer = await stripeFetch('/customers', {
            method: 'POST',
            body: new URLSearchParams({
              email,
              name: name || email.split('@')[0],
              'metadata[source]': 'mycompi'
            })
          })
          return new Response(JSON.stringify({
            success: true,
            customerId: customer.id
          }), { headers })
        }

        case 'get_subscription': {
          const { customerId } = body
          const subscriptions = await stripeFetch(`/customers/${customerId}/subscriptions?limit=1&status=active`)
          return new Response(JSON.stringify({
            success: true,
            subscription: subscriptions.data?.[0] || null
          }), { headers })
        }

        case 'cancel_subscription': {
          const { subscriptionId } = body
          const sub = await stripeFetch(`/subscriptions/${subscriptionId}`, { method: 'GET' })
          const cancelled = await stripeFetch(`/subscriptions/${subscriptionId}`, {
            method: 'POST',
            body: new URLSearchParams({ 'cancel_at_period_end': 'true' })
          })
          return new Response(JSON.stringify({
            success: true,
            cancelled: true,
            cancelAt: cancelled.cancel_at,
            currentPeriodEnd: sub.current_period_end
          }), { headers })
        }

        case 'reactivate_subscription': {
          const { subscriptionId } = body
          const reactivated = await stripeFetch(`/subscriptions/${subscriptionId}`, {
            method: 'POST',
            body: new URLSearchParams({ 'cancel_at_period_end': 'false' })
          })
          return new Response(JSON.stringify({
            success: true,
            reactivated: true,
            currentPeriodEnd: reactivated.current_period_end
          }), { headers })
        }

        case 'create_portal': {
          const { customerId, returnUrl } = body
          const session = await stripeFetch('/billing_portal/sessions', {
            method: 'POST',
            body: new URLSearchParams({
              'customer': customerId,
              'return_url': returnUrl || 'https://guuimyx3.insforge.site/perfil'
            })
          })
          return new Response(JSON.stringify({
            success: true,
            url: session.url
          }), { headers })
        }

        case 'get_customer': {
          const { customerId } = body
          const customer = await stripeFetch(`/customers/${customerId}`)
          return new Response(JSON.stringify({
            success: true,
            customer: {
              id: customer.id,
              email: customer.email,
              name: customer.name,
              created: customer.created,
              subscriptions: customer.subscriptions?.data?.map((s: any) => ({
                id: s.id,
                status: s.status,
                plan: s.items?.data?.[0]?.price?.nickname,
                currentPeriodEnd: s.current_period_end,
                cancelAt: s.cancel_at,
                billing: s.metadata?.billing || 'month'
              })) || []
            }
          }), { headers })
        }

        case 'webhook': {
          return new Response(JSON.stringify({ received: true, action: 'webhook' }), { headers })
        }

        case 'get_plans': {
          return new Response(JSON.stringify({
            success: true,
            plans: Object.entries(PLANS).map(([key, val]) => ({
              id: key,
              name: val.name,
              amountMonthly: val.amountMonthly,
              amountYearly: val.amountYearly,
              interval: val.interval,
              priceIdMonthly: val.priceIdMonthly,
              priceIdYearly: val.priceIdYearly
            }))
          }), { headers })
        }

        default:
          return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers })
      }
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
  }
}
