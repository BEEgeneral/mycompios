# Auth System Documentation

**Last updated:** 2026-05-05
**Status:** ✅ Operational

## Architecture

We use **Neon PostgreSQL directly** via API routes in Next.js (Vercel). No dependency on InsForge for auth.

```
Frontend (Vercel) → API Routes → Neon PostgreSQL
                    (no middleman)
```

## Why Neon (not InsForge)?

InsForge functions lose `ctx.supabase` when deployed via CLI/MCP — making auth impossible. Neon provides direct database access without any middleware.

## Setup

### 1. Environment Variables

```env
# .env.local
NEON_HOST=ep-mute-mud-agxfgf1q-pooler.c-2.eu-central-1.aws.neon.tech
NEON_PORT=5432
NEON_DB=neondb
NEON_USER=neondb_owner
NEON_PASSWORD=npg_WtabOh4u2KiL
```

### 2. Database Connection

We use `@neondatabase/serverless` for serverless-compatible connections:

```typescript
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)
```

Where `DATABASE_URL` = `postgresql://neondb_owner:npg_WtabOh4u2KiL@ep-mute-mud-agxfgf1q-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create new user + company + session |
| POST | `/api/auth/login` | Validate credentials, return session |
| POST | `/api/auth/logout` | Delete session |
| GET | `/api/auth/me` | Get current user from session token |

## Database Schema

### app_user
```sql
id          UUID PRIMARY KEY
name        TEXT NOT NULL
email       TEXT UNIQUE NOT NULL
company_id  UUID REFERENCES companies(id)
password_hash TEXT NOT NULL
created_at  TIMESTAMPTZ DEFAULT NOW()
```

### companies
```sql
id          UUID PRIMARY KEY
name        TEXT NOT NULL
email       TEXT NOT NULL
plan        TEXT DEFAULT 'trial'
trial_expires_at TIMESTAMPTZ
created_at  TIMESTAMPTZ DEFAULT NOW()
```

### sessions
```sql
id          TEXT PRIMARY KEY  -- token
user_id     UUID REFERENCES app_user(id)
expires_at  TIMESTAMPTZ
created_at  TIMESTAMPTZ DEFAULT NOW()
```

## Password Hashing

We use **SHA-256 with salt** (for demo compatibility):

```typescript
const hash = SHA-256(password + 'MYCOMPI_SALT_2026')
```

**Note:** For production, migrate to PBKDF2/bcrypt.

## Auth Flow

### Registration
1. Validate email/password/name/company
2. Check email doesn't exist
3. Create company (UUID)
4. Hash password
5. Create user
6. Create session token (random hex + userId)
7. Return `{ userId, companyId, token }`

### Login
1. Normalize email to lowercase
2. Find user by email
3. Verify password hash
4. Create new session
5. Return `{ userId, companyId, token }`

### Session Validation
```typescript
const token = req.headers.get('Authorization')?.replace('Bearer ', '')
const users = await sql`SELECT * FROM sessions WHERE id = ${token}`
if (!users.length) return 401
if (new Date(users[0].expires_at) < new Date()) return 401
```

## Security Rules

- Token sent via `Authorization: Bearer <token>` header
- Tokens expire after 30 days
- Email normalized to lowercase
- Passwords hashed with salt before storage
- CORS enabled for frontend origin

## Common Issues

### "Connection refused" errors
- Check `NEON_PASSWORD` is correct
- Ensure Neon IP whitelist includes Vercel (0.0.0.0/0 works)
- Try `sslmode=require` in connection string

### "Password hash mismatch"
- Verify salt constant matches between register/login
- Check if user's password was hashed with different algorithm

### "Email already exists"
- Normal user error, not a bug
- Tell user to use "forgot password" or different email

## Future Improvements

- [ ] Migrate to bcrypt/PBKDF2 for password hashing
- [ ] Add rate limiting
- [ ] Add email verification
- [ ] Add 2FA
- [ ] Add password reset flow
- [ ] Add session refresh (renew expiry on activity)

## Related Files

- `app/api/auth/register/route.ts`
- `app/api/auth/login/route.ts`
- `app/api/auth/logout/route.ts`
- `app/api/auth/me/route.ts`
