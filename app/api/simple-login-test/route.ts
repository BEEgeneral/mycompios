import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, password } = body || {}

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const connectionString = process.env.DATABASE_URL ||
      `postgresql://${process.env.NEON_USER}:${process.env.NEON_PASSWORD}@${process.env.NEON_HOST}/${process.env.NEON_DB}?ssl=true`

    const sql = neon(connectionString)
    const SALT = 'MYCOMPI_SALT_2026'
    const hash = Buffer.from(password + SALT).toString('hex')

    const users = await sql`
      SELECT u.id, u.name, u.email, u.password_hash
      FROM app_user u
      WHERE u.email = ${email.toLowerCase()}
    `

    if (!users.length) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const user = users[0]

    if (user.password_hash !== hash) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    return NextResponse.json({ success: true, userId: user.id, name: user.name })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}