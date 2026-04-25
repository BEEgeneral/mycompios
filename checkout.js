export default async function handler(req, ctx) {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Método no permitido' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { plan = 'monthly', userId, email } = await req.json();

  if (!userId || !email) {
    return new Response(
      JSON.stringify({ error: 'Datos de usuario requeridos', code: 'MISSING_DATA' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const prices = {
      monthly: 4900,
      annual: 47040
    };

    const priceId = plan === 'annual' ? 'price_annual' : 'price_monthly';

    const session = {
      id: 'cs_' + require('crypto').randomBytes(16).toString('hex'),
      user_id: userId,
      email,
      plan,
      amount: prices[plan],
      currency: 'eur',
      status: 'pending',
      created_at: new Date().toISOString(),
      url: `https://checkout.stripe.com/pay/cs_${require('crypto').randomBytes(16).toString('hex')}`
    };

    return new Response(
      JSON.stringify({
        success: true,
        sessionId: session.id,
        checkoutUrl: session.url,
        amount: session.amount,
        currency: session.currency
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Checkout error:', err);
    return new Response(
      JSON.stringify({ error: 'Error al crear sesión de pago' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
