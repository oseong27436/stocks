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
  const groupId = searchParams.get('group_id')
  const days = parseInt(searchParams.get('days') ?? '30')
  if (!groupId) return NextResponse.json({ error: 'group_id required' }, { status: 400 })

  // 그룹 멤버 확인
  const { data: members } = await adminSupabase
    .from('group_members')
    .select('user_id, user_profiles(nickname)')
    .eq('group_id', groupId)

  if (!members || members.length === 0) return NextResponse.json([])

  const userIds = members.map((m: any) => m.user_id)
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const { data: snapshots } = await adminSupabase
    .from('portfolio_snapshots')
    .select('user_id, date, total_value, total_invested')
    .in('user_id', userIds)
    .gte('date', since)
    .order('date', { ascending: true })

  // 닉네임 맵
  const nicknameMap: Record<string, string> = {}
  for (const m of members) {
    nicknameMap[m.user_id] = (m.user_profiles as any)?.nickname ?? '-'
  }

  // 유저별로 묶기
  const byUser: Record<string, { date: string; pnlPct: number; totalValue: number }[]> = {}
  for (const snap of snapshots ?? []) {
    if (!byUser[snap.user_id]) byUser[snap.user_id] = []
    const pnlPct = snap.total_invested > 0
      ? ((snap.total_value - snap.total_invested) / snap.total_invested) * 100
      : 0
    byUser[snap.user_id].push({ date: snap.date, pnlPct, totalValue: snap.total_value })
  }

  const result = Object.entries(byUser).map(([userId, data]) => ({
    userId,
    nickname: nicknameMap[userId],
    data,
  }))

  return NextResponse.json(result)
}
