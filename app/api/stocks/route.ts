import { NextRequest, NextResponse } from 'next/server'
import { fetchQuote, fetchUsdKrwRate } from '@/lib/yahoo'

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
      if (q.currency === 'KRW' && rate > 1 && !q.symbol.includes('=X') && !q.symbol.startsWith('^')) {
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
