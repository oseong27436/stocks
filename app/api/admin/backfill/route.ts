import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function verifyAdmin(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data } = await adminSupabase.auth.getUser(token)
  if (!data.user) return null
  const { data: profile } = await adminSupabase
    .from('user_profiles')
    .select('is_admin')
    .eq('id', data.user.id)
    .single()
  return profile?.is_admin ? data.user : null
}

async function fetchHistoricalClose(symbol: string, dateStr: string): Promise<{ price: number; currency: string }> {
  const d = new Date(dateStr + 'T00:00:00Z')
  const period1 = Math.floor(d.getTime() / 1000) - 3600       // 1시간 전
  const period2 = Math.floor(d.getTime() / 1000) + 86400 * 2  // 2일 후

  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&period1=${period1}&period2=${period2}`,
    { headers: { 'User-Agent': UA, 'Accept': 'application/json' } }
  )
  const data = await res.json()
  const result = data?.chart?.result?.[0]
  if (!result) return { price: 0, currency: 'USD' }

  const currency = result.meta?.currency ?? 'USD'
  const timestamps: number[] = result.timestamp ?? []
  const closes: number[] = result.indicators?.quote?.[0]?.close ?? []

  // 해당 날짜와 가장 가까운 종가 선택
  const targetTs = d.getTime() / 1000 + 43200 // 정오 기준
  let bestIdx = 0
  let bestDiff = Infinity
  for (let i = 0; i < timestamps.length; i++) {
    const diff = Math.abs(timestamps[i] - targetTs)
    if (diff < bestDiff && closes[i] != null) {
      bestDiff = diff
      bestIdx = i
    }
  }

  return { price: closes[bestIdx] ?? 0, currency }
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { dates } = await req.json() as { dates: string[] }
  if (!dates?.length) return NextResponse.json({ error: 'dates required (YYYY-MM-DD[])' }, { status: 400 })

  // 모든 유저 보유 종목
  const { data: allHoldings } = await adminSupabase
    .from('holdings')
    .select('user_id, symbol, quantity, avg_price')

  if (!allHoldings || allHoldings.length === 0) {
    return NextResponse.json({ ok: true, message: 'no holdings' })
  }

  const allSymbols = [...new Set(allHoldings.map(h => h.symbol))]

  const results: Record<string, { saved: number; skipped: number }> = {}

  for (const date of dates) {
    // 이미 데이터 있으면 스킵
    const { data: existing } = await adminSupabase
      .from('portfolio_snapshots')
      .select('user_id')
      .eq('date', date)

    const existingUsers = new Set((existing ?? []).map((r: { user_id: string }) => r.user_id))

    // 해당 날짜 가격 조회
    const priceMap: Record<string, number> = {}
    const currencyMap: Record<string, string> = {}

    await Promise.all(allSymbols.map(async (sym) => {
      const { price, currency } = await fetchHistoricalClose(sym, date)
      priceMap[sym] = price
      currencyMap[sym] = currency
    }))

    // KRW→USD 환율
    const { price: usdKrwRate } = await fetchHistoricalClose('USDKRW=X', date)
    const rate = usdKrwRate > 1 ? usdKrwRate : 1350

    // 유저별 묶기
    const byUser: Record<string, typeof allHoldings> = {}
    for (const h of allHoldings) {
      if (!byUser[h.user_id]) byUser[h.user_id] = []
      byUser[h.user_id].push(h)
    }

    const snapshots = Object.entries(byUser)
      .filter(([userId]) => !existingUsers.has(userId))
      .map(([userId, holdings]) => {
        const totalValue = holdings.reduce((s, h) => {
          let price = priceMap[h.symbol] ?? h.avg_price
          if (currencyMap[h.symbol] === 'KRW' && rate > 1 && !h.symbol.includes('=X') && !h.symbol.startsWith('^')) {
            price = price / rate
          }
          return s + price * h.quantity
        }, 0)
        const totalInvested = holdings.reduce((s, h) => s + h.avg_price * h.quantity, 0)
        return { user_id: userId, date, total_value: totalValue, total_invested: totalInvested }
      })

    if (snapshots.length > 0) {
      await adminSupabase
        .from('portfolio_snapshots')
        .upsert(snapshots, { onConflict: 'user_id,date' })
    }

    results[date] = { saved: snapshots.length, skipped: existingUsers.size }
  }

  return NextResponse.json({ ok: true, results })
}
