import { NextRequest, NextResponse } from 'next/server'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchQuote(symbol: string) {
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
    { headers: { 'User-Agent': UA, 'Accept': 'application/json' } }
  )
  const data = await res.json()
  const meta = data?.chart?.result?.[0]?.meta ?? {}
  const price = meta.regularMarketPrice ?? 0
  const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? 0
  const change = meta.regularMarketChange ?? (prevClose ? price - prevClose : 0)
  const changePercent = meta.regularMarketChangePercent ?? (prevClose ? (price - prevClose) / prevClose * 100 : 0)
  return {
    symbol,
    name: meta.longName || meta.shortName || symbol,
    price,
    change,
    changePercent,
    prevClose,
    currency: (meta.currency ?? 'USD') as string,
  }
}

async function fetchUsdKrwRate(): Promise<number> {
  try {
    const res = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/USDKRW=X?interval=1d&range=1d',
      { headers: { 'User-Agent': UA, 'Accept': 'application/json' } }
    )
    const data = await res.json()
    return data?.chart?.result?.[0]?.meta?.regularMarketPrice ?? 1350
  } catch {
    return 1350
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbolsParam = searchParams.get('symbols')
  const query = searchParams.get('search')

  if (query) {
    try {
      const res = await fetch(
        `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=6&newsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query`,
        { headers: { 'User-Agent': UA } }
      )
      const json = await res.json()
      const items = (json.quotes ?? [])
        .filter((q: any) => ['EQUITY', 'ETF', 'MUTUALFUND'].includes(q.quoteType) && q.symbol)
        .slice(0, 6)
        .map((q: any) => ({ symbol: q.symbol, name: q.longname || q.shortname || q.symbol }))
      return NextResponse.json(items)
    } catch {
      return NextResponse.json([])
    }
  }

  if (!symbolsParam) {
    return NextResponse.json({ error: 'symbols required' }, { status: 400 })
  }

  try {
    const symbols = symbolsParam.split(',').map(s => s.trim()).filter(Boolean)
    const quotes = await Promise.all(symbols.map(fetchQuote))

    // KRW 종목이 있으면 환율 가져와서 USD로 변환
    const hasKrw = quotes.some(q => q.currency === 'KRW')
    const rate = hasKrw ? await fetchUsdKrwRate() : 1

    const normalized = quotes.map(q => {
      if (q.currency === 'KRW' && rate > 1) {
        return {
          ...q,
          price: q.price / rate,
          change: q.change / rate,
          prevClose: q.prevClose / rate,
        }
      }
      return q
    })

    return NextResponse.json(normalized)
  } catch (e) {
    console.error('quote error:', e)
    return NextResponse.json([], { status: 500 })
  }
}
