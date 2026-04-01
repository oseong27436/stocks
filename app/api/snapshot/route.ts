import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchQuote, fetchUsdKrwRate } from '@/lib/yahoo'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  // Vercel cron은 Authorization 헤더로 보호
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().slice(0, 10)

  // 보유 종목 있는 모든 유저
  const { data: allHoldings } = await adminSupabase
    .from('holdings')
    .select('user_id, symbol, quantity, avg_price')

  if (!allHoldings || allHoldings.length === 0) {
    return NextResponse.json({ ok: true, message: 'no holdings' })
  }

  // 유저별로 묶기
  const byUser: Record<string, typeof allHoldings> = {}
  for (const h of allHoldings) {
    if (!byUser[h.user_id]) byUser[h.user_id] = []
    byUser[h.user_id].push(h)
  }

  // 필요한 심볼 전체 한 번에 가격 조회
  const allSymbols = [...new Set(allHoldings.map(h => h.symbol))]
  const rawQuotes = await Promise.all(allSymbols.map(fetchQuote))
  const hasKrw = rawQuotes.some(q => q.currency === 'KRW')
  const rate = hasKrw ? await fetchUsdKrwRate() : 1
  const priceMap: Record<string, number> = {}
  for (const q of rawQuotes) {
    const price = q.currency === 'KRW' && rate > 1 ? q.price / rate : q.price
    priceMap[q.symbol] = price
  }

  // 유저별 스냅샷 upsert
  const snapshots = Object.entries(byUser).map(([userId, holdings]) => {
    const totalValue = holdings.reduce((s, h) => s + (priceMap[h.symbol] ?? h.avg_price) * h.quantity, 0)
    const totalInvested = holdings.reduce((s, h) => s + h.avg_price * h.quantity, 0)
    return { user_id: userId, date: today, total_value: totalValue, total_invested: totalInvested }
  })

  await adminSupabase
    .from('portfolio_snapshots')
    .upsert(snapshots, { onConflict: 'user_id,date' })

  return NextResponse.json({ ok: true, saved: snapshots.length, date: today })
}
