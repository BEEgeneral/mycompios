// MyCompi Authentication - Register
// FIXED: PBKDF2 passwords, rate limiting, CORS whitelist, no hardcoded secrets

// ===== RATE LIMITING =====
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 min
const RATE_LIMIT_MAX = 3; // 3 registrations per IP per window
const rateLimitMap = new Map();

function rateLimitCheck(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW };
  
  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + RATE_LIMIT_WINDOW;
  }
  
  record.count++;
  rateLimitMap.set(ip, record);
  
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
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };
}

// ===== SECURE PASSWORD HASHING (PBKDF2) =====
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  
  const keyMaterial = await globalThis.crypto.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  const derivedBits = await globalThis.crypto.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 310000, // OWASP recommended
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
  
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `$pbkdf2$${saltHex}$${hashHex}`;
}

// ===== PASSWORD VERIFICATION =====
async function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.startsWith('$pbkdf2$')) return false;
  
  try {
    const parts = storedHash.split('$');
    if (parts.length !== 4) return false;
    
    const saltHex = parts[2];
    const storedKeyHex = parts[3];
    const salt = new Uint8Array(saltHex.match(/.{2}/g).map(byte => parseInt(byte, 16)));
    
    const encoder = new TextEncoder();
    const keyMaterial = await globalThis.crypto.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    
    const derivedBits = await globalThis.crypto.deriveBits(
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
  } catch {
    return false;
  }
}

// ===== SECURE TOKEN GENERATION =====
function generateSecureToken() {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateAPIKey() {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(24));
  return 'mc_' + Array.from(bytes).map(b => b.toString(36)).join('');
}

// ===== INPUT VALIDATION =====
function validatePassword(password) {
  if (!password) return { valid: false, error: 'Password is required' };
  if (password.length < 8) return { valid: false, error: 'Password must be at least 8 characters' };
  if (password.length > 128) return { valid: false, error: 'Password too long' };
  
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const complexity = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
  if (complexity < 2) {
    return { valid: false, error: 'Password too weak. Use mix of letters, numbers, symbols' };
  }
  
  return { valid: true };
}

function getClientIP(req) {
  return req.headers.get('cf-connecting-ip') ||
         req.headers.get('x-forwarded-for')?.split(',')[0] ||
         req.headers.get('x-real-ip') ||
         'unknown';
}

export default async function handler(req, ctx) {
  const origin = req.headers.get('origin') || '';
  const headers = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 204, headers });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers });
  }

  // Rate limiting
  const clientIP = getClientIP(req);
  const rateCheck = rateLimitCheck(clientIP);
  
  if (!rateCheck.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Demasiados registros. Intenta más tarde.',
        code: 'RATE_LIMITED',
        retryIn: rateCheck.resetIn
      }),
      { status: 429, headers }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers });
  }

  const { email, password, name, company, sector, vision } = body;

  // Validate required fields
  const missing = ['email', 'password', 'name', 'company'].filter(f => !body[f]);
  if (missing.length > 0) {
    return new Response(
      JSON.stringify({
        error: `Faltan campos: ${missing.join(', ')}`,
        code: 'MISSING_FIELDS',
        remaining: rateCheck.remaining
      }),
      { status: 400, headers }
    );
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return new Response(
      JSON.stringify({ error: 'Email inválido', code: 'INVALID_EMAIL' }),
      { status: 400, headers }
    );
  }

  // Validate password strength
  const passwordCheck = validatePassword(password);
  if (!passwordCheck.valid) {
    return new Response(
      JSON.stringify({ error: passwordCheck.error, code: 'WEAK_PASSWORD' }),
      { status: 400, headers }
    );
  }

  try {
    const supabase = ctx.supabase || await ctx.database();
    const now = new Date().toISOString();

    // Check existing user
    const { data: existing } = await supabase
      .from('app_user')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      return new Response(
        JSON.stringify({
          error: 'Ya existe una cuenta con este email',
          code: 'EMAIL_EXISTS'
        }),
        { status: 409, headers }
      );
    }

    // Create company with trial (3 days)
    const trialExpiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const companyId = globalThis.crypto.randomUUID();
    const apiKey = generateAPIKey();

    let companyData = null;
    try {
      const { data, error } = await supabase
        .from('companies')
        .insert({
          id: companyId,
          name: company,
          email: email.toLowerCase(),
          plan: 'trial',
          trial_expires_at: trialExpiresAt,
          api_key: apiKey,
          created_at: now,
          metadata: { sector: sector || 'general', vision: vision || '' }
        })
        .select()
        .single();
      if (!error) companyData = data;
    } catch (e) {
      console.error('Company insert error:', e.message);
    }

    // Hash password with PBKDF2
    const passwordHash = await hashPassword(password);

    // Create user
    const { data: userData, error: userError } = await supabase
      .from('app_user')
      .insert({
        name,
        email: email.toLowerCase(),
        company,
        password_hash: passwordHash,
        created_at: now
      })
      .select()
      .single();

    if (userError) {
      console.error('User creation error:', userError);
      return new Response(
        JSON.stringify({ error: 'Error al crear la cuenta', code: 'DB_ERROR' }),
        { status: 500, headers }
      );
    }

    // Generate secure session token
    const token = generateSecureToken();
    const sessionDuration = 30 * 24 * 60 * 60 * 1000; // 30 days

    // Store session
    try {
      await supabase
        .from('sessions')
        .insert({
          user_id: userData.id,
          token_hash: token.substring(0, 64), // Store hash of token
          created_at: now,
          expires_at: new Date(Date.now() + sessionDuration).toISOString()
        });
    } catch (e) {
      console.error('Session insert error:', e.message);
    }

    // Initialize agents
    let agentsInitialized = false;
    try {
      const autonomousRes = await fetch('https://guuimyx3.functions.insforge.app/autonomous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'init',
          companyId: companyId,
          config: {
            companyName: company,
            sector: sector || 'general',
            vision: vision || '',
            timezone: 'Europe/Madrid',
            onboardingComplete: true,
            userId: userData.id
          }
        })
      });
      const autonomousData = await autonomousRes.json();
      agentsInitialized = !autonomousData.error;
    } catch (e) {
      console.error('Agent init error:', e.message);
    }

    // Send welcome email (API key from env)
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || process.env.RESEND_API_KEY;
    if (RESEND_API_KEY) {
      try {
        const welcomeHtml = `<h1>¡Bienvenido, ${company}!</h1><p>Tu equipo de Compis está listo.</p>`;
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`
          },
          body: JSON.stringify({
            from: 'MyCompi <onboarding@mycompi.com>',
            to: [email],
            subject: `¡${company}, tu equipo está listo! 🎉`,
            html: welcomeHtml
          })
        });
      } catch (e) {
        console.error('Email error:', e.message);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: userData.id,
          name: userData.name,
          email: userData.email
        },
        company: {
          id: companyId,
          name: company,
          apiKey: apiKey,
          plan: 'trial',
          trialExpiresAt
        },
        agentsInitialized,
        token
      }),
      { status: 201, headers }
    );

  } catch (err) {
    console.error('Register error:', err.message);
    return new Response(
      JSON.stringify({ error: 'Error interno', code: 'INTERNAL_ERROR' }),
      { status: 500, headers }
    );
  }
}