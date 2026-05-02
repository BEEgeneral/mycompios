/**
 * Stripe Service - Payment processing (DEBUG VERSION)
 * All DB operations removed - returns mock data
 */

export async function getUserBySessionToken(token: string): Promise<any | null> {
  console.log('[DEBUG] getUserBySessionToken called with token:', token.substring(0, 20))
  
  // Return mock session data
  return {
    user_id: 'e748ea4a-ef99-420e-88d3-480363352996',
    email: 'nocache_test_1777234348@mycompi.com',
    name: 'Test User',
    company: 'Test Company SL'
  }
}

export async function getCompanyByName(name: string): Promise<any | null> {
  console.log('[DEBUG] getCompanyByName called with name:', name)
  
  // Return mock company data
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
  const sessionId = 'cs_mock_' + Date.now()
  return {
    sessionId,
    url: `${cancelUrl}?session_id=${sessionId}`
  }
}

export async function updateCompanyPlan(companyId: string, plan: string): Promise<void> {
  console.log('[DEBUG] updateCompanyPlan called:', companyId, plan)
}