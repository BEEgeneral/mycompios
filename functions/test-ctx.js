export default async function handler(req, ctx) {
  return Response.json({ 
    hasCtx: !!ctx, 
    ctxKeys: ctx ? Object.keys(ctx) : [],
    hasSupabase: ctx?.supabase ? true : false,
    hasDatabase: ctx?.database ? true : false,
    globalKeys: Object.keys(globalThis).filter(k => k.includes('db') || k.includes('supabase')).slice(0, 5)
  })
}
