import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: { user } } = await adminSupabase.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { totalValue, totalInvested } = await req.json()
  if (typeof totalValue !== 'number' || typeof totalInvested !== 'number') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const today = new Date().toISOString().slice(0, 10)

  await adminSupabase
    .from('portfolio_snapshots')
    .upsert(
      { user_id: user.id, date: today, total_value: totalValue, total_invested: totalInvested },
      { onConflict: 'user_id,date' }
    )

  return NextResponse.json({ ok: true, date: today })
}
