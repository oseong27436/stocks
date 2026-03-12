import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: { user } } = await adminSupabase.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const days = parseInt(searchParams.get('days') ?? '14')
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const { data: snapshots } = await adminSupabase
    .from('portfolio_snapshots')
    .select('date, total_value, total_invested')
    .eq('user_id', user.id)
    .gte('date', since)
    .order('date', { ascending: true })

  if (!snapshots || snapshots.length === 0) return NextResponse.json([])

  // 날짜별 일일 손익 계산 (전날 대비 변화)
  const result = snapshots.map((snap, i) => {
    const prev = snapshots[i - 1]
    const dailyChange = prev ? snap.total_value - prev.total_value : 0
    const pnl = snap.total_value - snap.total_invested
    const pnlPct = snap.total_invested > 0 ? (pnl / snap.total_invested) * 100 : 0
    return {
      date: snap.date,
      totalValue: snap.total_value,
      totalInvested: snap.total_invested,
      pnl,
      pnlPct,
      dailyChange,
    }
  })

  return NextResponse.json(result.reverse()) // 최신순
}
