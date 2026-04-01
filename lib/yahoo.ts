const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export async function fetchQuote(symbol: string) {
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

export async function fetchUsdKrwRate(): Promise<number> {
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
