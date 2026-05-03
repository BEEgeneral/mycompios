// Test function - returns what ctx contains

export default async function handler(req, ctx) {
  return new Response(JSON.stringify({
    ctxType: typeof ctx,
    ctxKeys: ctx ? Object.keys(ctx) : 'ctx is null/undefined',
    ctxSupabase: ctx?.supabase,
    hasDatabase: ctx?.database ? 'yes' : 'no',
    args: typeof req
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
