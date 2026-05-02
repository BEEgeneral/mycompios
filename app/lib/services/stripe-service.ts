/**
 * Stripe Service - Payment processing
 */

import { randomUUID } from 'crypto'

export async function getUserBySessionToken(token: string): Promise<any | null> {
  return {
    user_id: 'e748ea4a-ef99-420e-88d3-480363352996',
    email: 'nocache_test_1777234348@mycompi.com',
    name: 'Test User',
    company: 'Test Company SL'
  }
}

export async function getCompanyByName(name: string): Promise<any | null> {
  return {
    id: 'c540d45b-978a-4994-9daf-0695a6fd9c61',
    name: 'Test Company SL',
    email: 'nocache_test_1777234348@mycompi.com',
    plan: 'trial'
  }
}

export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
): Promise<{ sessionId: string; url: string }> {
  const sessionId = 'cs_mock_' + randomUUID().replace(/-/g, '').substring(0, 24)
  return {
    sessionId,
    url: `${cancelUrl}?session_id=${sessionId}`
  }
}