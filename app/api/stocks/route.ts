import { NextRequest, NextResponse } from 'next/server'
import yahooFinance from 'yahoo-finance2'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbols = searchParams.get('symbols')?.split(',') ?? []

  if (symbols.length === 0) {
    return NextResponse.json({ error: 'symbols required' }, { status: 400 })
  }

  try {
    const quotes = await Promise.all(
      symbols.map(async (symbol) => {
        const q = await yahooFinance.quote(symbol) as any
        return {
          symbol,
          name: q.longName || q.shortName || symbol,
          price: q.regularMarketPrice,
          change: q.regularMarketChange,
          changePercent: q.regularMarketChangePercent,
          previousClose: q.regularMarketPreviousClose,
        }
      })
    )
    return NextResponse.json(quotes)
  } catch (e) {
    return NextResponse.json({ error: 'fetch failed' }, { status: 500 })
  }
}
