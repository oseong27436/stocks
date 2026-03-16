import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

// 카카오톡 이름 → user_id 매핑
const SENDER_MAP: Record<string, string> = {
  '오성': '77470174-496a-48d6-847f-114bd11a04b4',
  '김정민': '586f4a73-7c38-4d2f-b18b-955b95f6795f',
}

async function getDailyPnl(userId: string): Promise<string> {
  const { data: holdings } = await adminSupabase
    .from('holdings')
    .select('symbol, quantity, avg_price')
    .eq('user_id', userId)

  if (!holdings || holdings.length === 0) return '보유 종목이 없습니다.'

  const symbols = holdings.map(h => h.symbol).join(',')
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/stocks?symbols=${symbols}`,
    { headers: { 'User-Agent': UA } }
  )
  const quotes: { symbol: string; price: number; change: number; changePercent: number }[] = await res.json()
  const quoteMap = Object.fromEntries(quotes.map(q => [q.symbol, q]))

  let dailyPnl = 0
  let totalValue = 0
  const lines: string[] = []

  for (const h of holdings) {
    const q = quoteMap[h.symbol]
    if (!q) continue
    const todayPnl = q.change * h.quantity
    dailyPnl += todayPnl
    totalValue += q.price * h.quantity
    const sign = todayPnl >= 0 ? '+' : ''
    lines.push(`${h.symbol}: ${sign}$${todayPnl.toFixed(2)} (${q.changePercent >= 0 ? '+' : ''}${q.changePercent.toFixed(2)}%)`)
  }

  const sign = dailyPnl >= 0 ? '+' : ''
  const summary = `📊 오늘 수익: ${sign}$${dailyPnl.toFixed(2)}\n총 평가금액: $${totalValue.toFixed(2)}\n\n` + lines.join('\n')
  return summary
}

export async function GET(req: NextRequest) {
  // API 키 인증
  const apiKey = req.headers.get('x-bot-key')
  if (apiKey !== process.env.BOT_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const cmd = searchParams.get('cmd')
  const sender = searchParams.get('sender') ?? ''

  const userId = SENDER_MAP[sender]
  if (!userId) {
    return new NextResponse(`등록되지 않은 사용자입니다: ${sender}`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  }

  if (cmd === '오늘수익') {
    const result = await getDailyPnl(userId)
    return new NextResponse(result, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  }

  return new NextResponse('알 수 없는 명령어입니다.', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
