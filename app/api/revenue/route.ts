import { NextResponse } from 'next/server'
import { getRevenueData } from '../../lib/services/revenue-service'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('company_id')

  if (!companyId) {
    return NextResponse.json({ error: 'company_id required' }, { status: 400 })
  }

  const data = await getRevenueData(companyId)
  return NextResponse.json(data)
}
