import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const connectionString = `postgresql://${process.env.NEON_USER}:${process.env.NEON_PASSWORD}@${process.env.NEON_HOST}/${process.env.NEON_DB}?ssl=true`
    const sql = neon(connectionString)
    
    const users = await sql`
      SELECT id, name, email, password_hash 
      FROM app_user 
      WHERE LOWER(email) = LOWER(${email})
    `
    
    if (!users.length) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }
    
    const user = users[0]
    const hash = Buffer.from(password + 'MYCOMPI_SALT_2026').toString('hex')
    
    if (user.password_hash !== hash) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }
    
    return NextResponse.json({ success: true, userId: user.id, name: user.name })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}