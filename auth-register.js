export default async function handler(req, ctx) {
  const { email, password, name, company } = await req.json();

  if (!email || !password || !name || !company) {
    return new Response(
      JSON.stringify({ error: 'Faltan campos requeridos', code: 'MISSING_FIELDS' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (password.length < 8) {
    return new Response(
      JSON.stringify({ error: 'La contraseña debe tener al menos 8 caracteres', code: 'WEAK_PASSWORD' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return new Response(
      JSON.stringify({ error: 'Email inválido', code: 'INVALID_EMAIL' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabase = ctx.supabase || await ctx.database();

    const { data: existing } = await supabase
      .from('app_user')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      return new Response(
        JSON.stringify({ 
          error: 'Ya existe una cuenta con este email', 
          code: 'EMAIL_EXISTS',
          hint: '¿Ya tienes cuenta? <a href="/login">Accede aquí</a>'
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { data, error } = await supabase
      .from('app_user')
      .insert({
        name,
        email: email.toLowerCase(),
        company,
        password_hash: await hashPassword(password),
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Registration error:', error);
      return new Response(
        JSON.stringify({ error: 'Error al crear la cuenta. Inténtalo de nuevo.', code: 'DB_ERROR' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const token = generateToken(data.id);
    const sessionDuration = 30 * 24 * 60 * 60 * 1000;

    return new Response(
      JSON.stringify({
        success: true,
        userId: data.id,
        token,
        user: { id: data.id, name: data.name, email: data.email }
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `auth_token=${token}; HttpOnly; Path=/; Max-Age=${sessionDuration}; SameSite=Strict`
        }
      }
    );

  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Error interno. Por favor, inténtalo más tarde.', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

function hashPassword(password) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(password + 'MYCOMPI_SALT_2026').digest('hex');
}

function generateToken(userId) {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex') + '_' + userId;
}
