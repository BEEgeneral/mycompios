export default async function handler(req, ctx) {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Método no permitido' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { email, password } = await req.json();

  if (!email || !password) {
    return new Response(
      JSON.stringify({ error: 'Email y contraseña son requeridos', code: 'MISSING_CREDENTIALS' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabase = ctx.supabase || await ctx.database();

    const { data: user, error } = await supabase
      .from('app_user')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      return new Response(
        JSON.stringify({ error: 'Credenciales inválidas', code: 'INVALID_CREDENTIALS' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const hash = require('crypto').createHash('sha256').update(password + 'MYCOMPI_SALT_2026').digest('hex');

    if (user.password_hash !== hash) {
      return new Response(
        JSON.stringify({ error: 'Credenciales inválidas', code: 'INVALID_CREDENTIALS' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const token = require('crypto').randomBytes(32).toString('hex') + '_' + user.id;
    const sessionDuration = 30 * 24 * 60 * 60 * 1000;

    await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        token,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + sessionDuration).toISOString()
      });

    return new Response(
      JSON.stringify({
        success: true,
        token,
        user: { id: user.id, name: user.name, email: user.email, company: user.company }
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
    console.error('Login error:', err);
    return new Response(
      JSON.stringify({ error: 'Error al iniciar sesión', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
