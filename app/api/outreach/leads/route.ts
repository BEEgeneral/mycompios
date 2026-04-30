/**
 * Create Lead + Add to Outreach
 * POST /api/outreach/leads
 */

import { NextResponse } from 'next/server'
import { createLead, addToSequence } from '../../../lib/outreach'

export async function POST(request: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  
  try {
    const { company_id, email, name, company_name, source, notes, sequence_type } = await request.json()
    
    const lead = await createLead({
      company_id,
      email,
      name,
      company_name,
      source: source || 'manual',
      notes
    })
    
    if (sequence_type && ['cold', 'followup', 'demo'].includes(sequence_type)) {
      await addToSequence(lead.id, sequence_type)
    }
    
    return NextResponse.json({
      success: true,
      lead,
      message: sequence_type ? `Added to ${sequence_type} sequence` : 'Lead created'
    }, { status: 201, headers })
    
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500, headers })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } })
}
