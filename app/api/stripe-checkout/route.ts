// STRIPE CHECKOUT - Create checkout session with plan selection

import { NextResponse } from 'next/server'

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

    const { Pool } = require('pg')
    const pool = new Pool({
      host: process.env.NEON_HOST,
      port: 5432,
      database: process.env.NEON_DB,
      user: process.env.NEON_USER,
      password: process.env.NEON_PASSWORD,
      ssl: true,
      max: 1,
    })

    const sessionResult = await pool.query(
      'SELECT user_id FROM sessions WHERE token = $1 AND expires_at > NOW()',
      [token]
    )

    if (sessionResult.rows.length === 0) {
      await pool.end()
      return NextResponse.json({ error: 'Sesion invalida' }, { status: 401, headers })
    }

    const userResult = await pool.query(
      'SELECT u.company_id, c.name as company_name FROM app_user u JOIN companies c ON u.company_id = c.id WHERE u.id = $1',
      [sessionResult.rows[0].user_id]
    )

    if (userResult.rows.length === 0) {
      await pool.end()
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404, headers })
    }

    const company = userResult.rows[0]
    await pool.end()

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

    const body = await req.json()
    const { priceId } = body

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: priceId || 'price_1TMWMHFnOlGTfuoBIKY9H2P7',
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: 'https://mycompios.vercel.app/dashboard?upgrade=success',
      cancel_url: 'https://mycompios.vercel.app/dashboard?upgrade=cancelled',
      metadata: {
        company_id: company.company_id,
      },
    })

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url
    }, { status: 200, headers })

  } catch (err) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json({
      success: false,
      error: err.message
    }, { status: 500, headers })
  }
}
