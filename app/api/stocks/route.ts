import { NextRequest, NextResponse } from 'next/server'

const YF_HEADERS = { 'User-Agent': 'Mozilla/5.0' }

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbolsParam = searchParams.get('symbols')
  const query = searchParams.get('search')

  if (query) {
    try {
      const res = await fetch(
        `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=6&newsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query`,
        { headers: YF_HEADERS }
      )
      const json = await res.json()
      const items = (json.quotes ?? [])
        .filter((q: any) => q.quoteType === 'EQUITY' && q.symbol)
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
    const res = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbolsParam)}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,longName,shortName`,
      { headers: YF_HEADERS }
    )
    const json = await res.json()
    const results = json?.quoteResponse?.result ?? []
    const quotes = results.map((q: any) => ({
      symbol: q.symbol,
      name: q.longName || q.shortName || q.symbol,
      price: q.regularMarketPrice ?? 0,
      change: q.regularMarketChange ?? 0,
      changePercent: q.regularMarketChangePercent ?? 0,
    }))
    return NextResponse.json(quotes)
  } catch (e) {
    console.error('quote error:', e)
    return NextResponse.json([], { status: 500 })
  }
}
