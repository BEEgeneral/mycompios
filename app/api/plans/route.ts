// GET PRICES - Get available Stripe prices

import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  }

  return NextResponse.json({
    plans: [
      {
        id: 'price_1TMWMHFnOlGTfuoBIKY9H2P7',
        name: 'Mensual',
        price: 49,
        interval: 'month',
        description: 'Paga mes a mes'
      },
      {
        id: 'price_1TRCYsFnOlGTfuoBnuMZIjdZ',
        name: 'Anual',
        price: 490,
        interval: 'year',
        description: '2 meses gratis',
        savings: true
      }
    ]
  }, { status: 200, headers })
}
