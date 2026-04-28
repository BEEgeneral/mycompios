const { Pool } = require('pg');
const crypto = require('crypto');

async function test() {
  const pool = new Pool({
    host: 'ep-mute-mud-agxfgf1q-pooler.c-2.eu-central-1.aws.neon.tech',
    port: 5432,
    database: 'neondb',
    user: 'neondb_owner',
    password: 'npg_WtabOh4u2KiL',
    ssl: { rejectUnauthorized: false },
    max: 1,
  });

  const email = 'test' + Date.now() + '@beenocode.com';
  const now = new Date().toISOString();
  const trialExpiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const companyId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const salt = 'MYCOMPI_SALT_2026';
  const passwordHash = crypto.createHash('sha256').update('test123' + salt).digest('hex');

  try {
    // Check existing
    const existing = await pool.query('SELECT id FROM app_user WHERE LOWER(email) = LOWER($1)', [email]);
    console.log('Existing check:', existing.rows.length);

    // Insert company
    await pool.query(
      `INSERT INTO companies (id, name, email, plan, trial_expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [companyId, 'Test Co', email, 'trial', trialExpiresAt, now]
    );
    console.log('Company created:', companyId);

    // Insert user
    const userResult = await pool.query(
      `INSERT INTO app_user (id, name, email, company_id, password_hash, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email`,
      [userId, 'Test User', email, companyId, passwordHash, now]
    );
    console.log('User created:', userResult.rows[0]);

    console.log('ALL OK');
  } catch (err) {
    console.log('ERROR:', err.message);
    console.log('CODE:', err.code);
  } finally {
    await pool.end();
  }
}

test();
