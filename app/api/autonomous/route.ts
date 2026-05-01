/**
 * Autonomous Mode API - God Mode equivalent
 * GET /api/autonomous - Get pricing tiers
 * POST /api/autonomous - Create checkout session for selected tier
 */

import { NextResponse } from 'next/server'
import { AUTONOMOUS_TIERS, getTier, STRIPE_PRICES } from '../../lib/services/autonomous-service'

// Direct pool for autonomous endpoint to avoid s.id/s.token issue
function getDbPool() {
  const { Pool } = require('pg')
  return new Pool({
    host: process.env.NEON_HOST,
    port: 5432,
    database: process.env.NEON_DB,
    user: process.env.NEON_USER,
    password: process.env.NEON_PASSWORD,
    ssl: true,
    max: 1,
  })
}

async function getSessionInfo(token: string) {
  const pool = getDbPool()
  try {
    // sessions.id IS the token - use id = token directly with text cast
    const result = await pool.query(
      `SELECT s.user_id, u.email, u.name, u.company 
       FROM sessions s 
       JOIN app_user u ON u.id = s.user_id 
       WHERE s.id = $1::text AND s.expires_at > NOW()`,
      [token]
    )
    await pool.end()
    return result.rows[0] || null
  } catch (e) {
    await pool.end()
    throw e
  }
}

export async function GET(req: Request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  }

  // Return pricing tiers (public endpoint)
  const tiers = AUTONOMOUS_TIERS.map(tier => ({
    id: tier.id,
    duration: tier.duration,
    durationLabel: tier.durationLabel,
    price: tier.price,
    priceLabel: tier.priceLabel,
    hourlyRate: tier.hourlyRate,
    hourlyRateLabel: tier.hourlyRateLabel,
    features: tier.features
  }))

  return NextResponse.json({
    success: true,
    mode: 'Autonomous',
    tagline: 'Para las próximas X horas, tu equipo IA trabaja de forma continua',
    description: 'MyCompi toma decisiones y ejecuta tareas mientras tú descansas.',
    tiers,
    mostPopular: '24h',
    note: 'MyCompi hace decisiones de forma autónoma. Puedes chatear en cualquier momento para dar feedback.'
  }, { headers })
}

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
    // Auth check
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 401, headers })
    }

    const session = await getSessionInfo(token)
    if (!session) {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401, headers })
    }

    // Get tier from request
    const { tier_id, success_url, cancel_url } = await req.json()
    
    if (!tier_id) {
      return NextResponse.json({ error: 'tier_id requerido' }, { status: 400, headers })
    }

    const tier = getTier(tier_id)
    if (!tier) {
      return NextResponse.json({ error: 'Tier inválido' }, { status: 400, headers })
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY
    const baseSuccessUrl = success_url || 'https://mycompi.com/dashboard?autonomous=success'
    const baseCancelUrl = cancel_url || 'https://mycompi.com/dashboard?autonomous=cancelled'

    // Create Stripe checkout session
    if (stripeKey && stripeKey !== 'mock') {
      const stripe = require('stripe')(stripeKey)
      const stripePriceId = STRIPE_PRICES[tier_id]

      const checkoutSession = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price: stripePriceId,
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${baseSuccessUrl}&tier=${tier_id}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseCancelUrl}&tier=${tier_id}`,
        metadata: {
          tier_id: tier.id,
          duration_hours: tier.duration.toString(),
          company_name: session.company,
          customer_email: session.email
        },
        customer_email: session.email,
      })

      return NextResponse.json({
        success: true,
        mode: 'Autonomous',
        tier: {
          id: tier.id,
          durationLabel: tier.durationLabel,
          priceLabel: tier.priceLabel
        },
        checkoutUrl: checkoutSession.url,
        sessionId: checkoutSession.id
      }, { headers })
    }

    // Mock mode
    return NextResponse.json({
      success: true,
      mode: 'Autonomous',
      tier: {
        id: tier.id,
        duration: tier.duration,
        durationLabel: tier.durationLabel,
        price: tier.price,
        priceLabel: tier.priceLabel
      },
      message: 'Modo mock - Stripe no configurado',
      mockCheckoutUrl: `${baseCancelUrl}?mock=autonomous&tier=${tier_id}`
    }, { status: 200, headers })

  } catch (err) {
    console.error('Autonomous checkout error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers })
  }
}