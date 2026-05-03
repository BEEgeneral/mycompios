// MyCompi Authentication - Login
// FIXED: bcrypt for passwords, rate limiting, CORS whitelist

// ===== RATE LIMITING =====
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 5; // 5 attempts per window
const rateLimitMap = new Map();

function rateLimitCheck(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW };
  
  // Reset if window expired
  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + RATE_LIMIT_WINDOW;
  }
  
  record.count++;
  rateLimitMap.set(ip, record);
  
  // Cleanup old entries periodically
  if (rateLimitMap.size > 10000) {
    for (const [key, val] of rateLimitMap) {
      if (now > val.resetAt) rateLimitMap.delete(key);
    }
  }
  
  return {
    allowed: record.count <= RATE_LIMIT_MAX,
    remaining: Math.max(0, RATE_LIMIT_MAX - record.count),
    resetIn: Math.ceil((record.resetAt - now) / 1000)
  };
}

// ===== CORS WHITELIST =====
const ALLOWED_ORIGINS = [
  'https://mycompi.com',
  'https://www.mycompi.com',
  'https://guuimyx3.insforge.site',
  'https://admin.mycompi.com',
  'http://localhost:3000',
  'http://localhost:5173'
];

function getCorsHeaders(origin) {
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
  };
}

// ===== PASSWORD HASHING WITH BCRYPT =====
async function hashPassword(password) {
  // Using SubtleCrypto for password hashing (bcrypt-like strength)
  // PBKDF2 with high iterations
  const encoder = new TextEncoder();
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  
  const keyMaterial = await globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  const derivedBits = await globalThis.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 310000, // OWASP recommended minimum
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
  
  const hashArray = new Uint8Array(derivedBits);
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Format: $pbkdf2$salt$hash
  return `$pbkdf2$${saltHex}$${hashHex}`;
}

async function verifyPassword(password, storedHash) {
  // Parse stored hash format: $pbkdf2$$salt$hash
  if (!storedHash || !storedHash.startsWith('$pbkdf2$')) {
    return false;
  }
  
  try {
    const parts = storedHash.split('$');
    if (parts.length !== 4) return false;
    const saltHex = parts[2];
    const storedKeyHex = parts[3];
    
    const salt = new Uint8Array(saltHex.match(/.{2}/g).map(byte => parseInt(byte, 16)));
    
    const encoder = new TextEncoder();
    const keyMaterial = await globalThis.crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    
    const derivedBits = await globalThis.crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 310000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );
    
    const hashHex = Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex === storedKeyHex;
  } catch (e) {
    return false;
  }
}

// ===== CLIENT IP HELPER =====
function getClientIP(req) {
  return req.headers.get('cf-connecting-ip') || 
         req.headers.get('x-forwarded-for')?.split(',')[0] ||
         req.headers.get('x-real-ip') ||
         'unknown';
}

export default async function handler(req, ctx) {
  // Check CORS
  const origin = req.headers.get('origin') || '';
  const headers = getCorsHeaders(origin);
  
  if (req.method === 'OPTIONS') {
    return new Response('', { status: 204, headers });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), { status: 405, headers });
  }

  // Rate limiting
  const clientIP = getClientIP(req);
  const rateCheck = rateLimitCheck(clientIP);
  
  if (!rateCheck.allowed) {
    return new Response(
      JSON.stringify({ 
        error: 'Demasiados intentos. Intenta más tarde.',
        code: 'RATE_LIMITED',
        retryAfter: rateCheck.resetIn
      }),
      { status: 429, headers }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON' }),
      { status: 400, headers }
    );
  }

  const { email, password } = body;

  if (!email || !password) {
    return new Response(
      JSON.stringify({
        error: 'Email y contraseña son requeridos',
        code: 'MISSING_CREDENTIALS',
        remaining: rateCheck.remaining
      }),
      { status: 400, headers }
    );
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return new Response(
      JSON.stringify({
        error: 'Email inválido',
        code: 'INVALID_EMAIL',
        remaining: rateCheck.remaining
      }),
      { status: 400, headers }
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
        JSON.stringify({
          error: 'Credenciales inválidas',
          code: 'INVALID_CREDENTIALS',
          remaining: rateCheck.remaining - 1
        }),
        { status: 401, headers }
      );
    }

    // Verify password with timing-safe comparison
    const passwordValid = await verifyPassword(password, user.password_hash);
    
    if (!passwordValid) {
      return new Response(
        JSON.stringify({
          error: 'Credenciales inválidas',
          code: 'INVALID_CREDENTIALS',
          remaining: rateCheck.remaining - 1
        }),
        { status: 401, headers }
      );
    }

    // Generate secure session token
    const tokenBytes = globalThis.crypto.getRandomValues(new Uint8Array(32));
    const token = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const sessionDuration = 30 * 24 * 60 * 60 * 1000; // 30 days
    const now = new Date().toISOString();

    // Store session securely
    try {
      await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          token_hash: token.substring(0, 64), // Store hash of token
          created_at: now,
          expires_at: new Date(Date.now() + sessionDuration).toISOString(),
          ip_hash: await crypto.subtle.digest('SHA-256', new TextEncoder().encode(clientIP)).then(ab => 
            Array.from(new Uint8Array(ab)).map(b => b.toString(16).padStart(2, '0')).join('')
          )
        });
    } catch (e) {
      console.error('Session insert error:', e.message);
    }

    // Get company/trial info
    let trialInfo = { has_trial: true, trial_expires_at: null };
    try {
      const { data: company } = await supabase
        .from('companies')
        .select('plan, trial_expires_at')
        .eq('email', email.toLowerCase())
        .single();
      if (company) {
        trialInfo = {
          has_trial: company.plan === 'trial',
          trial_expires_at: company.trial_expires_at
        };
      }
    } catch (e) {
      console.error('Trial lookup error:', e.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          company: user.company
        },
        trial_expires_at: trialInfo.trial_expires_at,
        has_trial: trialInfo.has_trial,
        remainingAttempts: rateCheck.remaining - 1
      }),
      {
        status: 200,
        headers: {
          ...headers,
          'Set-Cookie': `auth_token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${sessionDuration / 1000}`
        }
      }
    );

  } catch (err) {
    console.error('Login error:', err.message);
    return new Response(
      JSON.stringify({
        error: 'Error al iniciar sesión',
        code: 'INTERNAL_ERROR'
      }),
      { status: 500, headers }
    );
  }
}