'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase, Holding, UserProfile } from '@/lib/supabase'
import { signOut } from '@/lib/auth'

type QuoteData = {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
}

type HoldingWithQuote = Holding & { quote?: QuoteData }

const INDEX_LABELS: Record<string, string> = {
  '^GSPC': 'S&P 500',
  '^IXIC': 'NASDAQ',
  '^DJI': 'DOW',
}

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [holdings, setHoldings] = useState<HoldingWithQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ symbol: '', quantity: '', avg_price: '', total_invested: '' })
  const [priceMode, setPriceMode] = useState<'avg' | 'total'>('avg')
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ symbol: string; name: string }[]>([])
  const [searching, setSearching] = useState(false)
  const [currency, setCurrency] = useState<'USD' | 'KRW'>(() =>
    (typeof window !== 'undefined' && localStorage.getItem('currency') as 'USD' | 'KRW') || 'USD'
  )
  const [exchangeRate, setExchangeRate] = useState<number>(1)
  const [hideAmounts, setHideAmounts] = useState(false)
  const [indices, setIndices] = useState<QuoteData[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [showNickname, setShowNickname] = useState(false)
  const [nickname, setNickname] = useState('')
  const [nicknameSaving, setNicknameSaving] = useState(false)
  const [pendingUserId, setPendingUserId] = useState('')
  const [editingHolding, setEditingHolding] = useState<HoldingWithQuote | null>(null)
  const [editForm, setEditForm] = useState({ quantity: '', avg_price: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null)
  const [tickerBlink, setTickerBlink] = useState(true)
  const [clock, setClock] = useState('')

  const fetchMarketData = useCallback(async () => {
    const [rateRes, idxRes] = await Promise.all([
      fetch('/api/stocks?symbols=USDKRW=X'),
      fetch('/api/stocks?symbols=%5EGSPC,%5EIXIC,%5EDJI'),
    ])
    const rateData = await rateRes.json()
    if (rateData?.[0]?.price) setExchangeRate(rateData[0].price)
    const idxData = await idxRes.json()
    if (Array.isArray(idxData)) setIndices(idxData)
  }, [])

  const fetchHoldings = useCallback(async (userId: string) => {
    const { data } = await supabase.from('holdings').select('*').eq('user_id', userId)
    if (!data || data.length === 0) return []
    const symbols = data.map((h: Holding) => h.symbol).join(',')
    const res = await fetch(`/api/stocks?symbols=${symbols}`)
    const quotes: QuoteData[] = await res.json()
    return data.map((h: Holding) => ({
      ...h,
      quote: quotes.find(q => q.symbol === h.symbol),
    }))
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const userId = data.session.user.id
      const { data: p } = await supabase.from('user_profiles').select('*').eq('id', userId).single()
      if (!p) {
        setPendingUserId(userId)
        setShowNickname(true)
        setLoading(false)
        return
      }
      setProfile(p)
      if (p?.is_admin) setIsAdmin(true)
      const [h] = await Promise.all([
        fetchHoldings(userId),
        fetchMarketData(),
      ])
      setHoldings(h)
      setLoading(false)
    })
  }, [router, fetchHoldings, fetchMarketData])

  // 60초마다 시장 데이터 새로고침
  useEffect(() => {
    const id = setInterval(fetchMarketData, 60_000)
    return () => clearInterval(id)
  }, [fetchMarketData])

  // 전광판 커서 깜빡임 + 시계
  useEffect(() => {
    const update = () => {
      setTickerBlink(b => !b)
      setClock(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }))
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return }
    const timer = setTimeout(async () => {
      setSearching(true)
      const res = await fetch(`/api/stocks?search=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()
      setSearchResults(data)
      setSearching(false)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  async function handleAddHolding(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: session } = await supabase.auth.getSession()
    if (!session.session) return
    const qty = parseFloat(form.quantity)
    const avgPrice = priceMode === 'total'
      ? parseFloat(form.total_invested) / qty
      : parseFloat(form.avg_price)
    await supabase.from('holdings').insert({
      user_id: session.session.user.id,
      symbol: form.symbol.toUpperCase(),
      quantity: qty,
      avg_price: avgPrice,
    })
    const h = await fetchHoldings(session.session.user.id)
    setHoldings(h)
    setForm({ symbol: '', quantity: '', avg_price: '', total_invested: '' })
    setShowAdd(false)
    setSaving(false)
  }

  async function handleSetNickname(e: React.FormEvent) {
    e.preventDefault()
    if (!nickname.trim()) return
    setNicknameSaving(true)
    await supabase.from('user_profiles').insert({ id: pendingUserId, nickname: nickname.trim() })
    const { data: p } = await supabase.from('user_profiles').select('*').eq('id', pendingUserId).single()
    setProfile(p)
    if (p?.is_admin) setIsAdmin(true)
    setShowNickname(false)
    const [h] = await Promise.all([fetchHoldings(pendingUserId), fetchMarketData()])
    setHoldings(h)
    setNicknameSaving(false)
  }

  async function handleDelete(id: string) {
    await supabase.from('holdings').delete().eq('id', id)
    setHoldings(prev => prev.filter(h => h.id !== id))
    setEditingHolding(null)
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editingHolding) return
    setEditSaving(true)
    await supabase.from('holdings').update({
      quantity: parseFloat(editForm.quantity),
      avg_price: parseFloat(editForm.avg_price),
    }).eq('id', editingHolding.id)
    const { data: session } = await supabase.auth.getSession()
    if (session.session) {
      const h = await fetchHoldings(session.session.user.id)
      setHoldings(h)
    }
    setEditingHolding(null)
    setEditSaving(false)
  }

  const rate = currency === 'KRW' ? exchangeRate : 1
  const fmtRaw = (usd: number) => currency === 'KRW'
    ? '₩' + Math.round(usd * rate).toLocaleString('ko-KR')
    : '$' + usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const fmt = (usd: number) => hideAmounts ? '••••••' : fmtRaw(usd)

  const totalInvested = holdings.reduce((s, h) => s + h.avg_price * h.quantity, 0)
  const totalCurrent = holdings.reduce((s, h) => s + (h.quote?.price ?? h.avg_price) * h.quantity, 0)
  const totalPnl = totalCurrent - totalInvested
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0

  if (loading) return <div className="flex min-h-screen items-center justify-center text-zinc-400">로딩 중...</div>

  if (showNickname) return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={handleSetNickname} className="bg-zinc-800 rounded-xl p-6 w-full max-w-sm flex flex-col gap-4">
        <h2 className="text-lg font-semibold">닉네임 설정</h2>
        <p className="text-sm text-zinc-400">그룹에서 표시될 이름을 정해주세요.</p>
        <input
          value={nickname}
          onChange={e => setNickname(e.target.value)}
          placeholder="닉네임 입력"
          required
          maxLength={20}
          className="bg-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={nicknameSaving}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg py-2 text-sm font-semibold transition-colors"
        >
          {nicknameSaving ? '저장 중...' : '시작하기'}
        </button>
      </form>
    </div>
  )

  return (
    <div className="min-h-screen relative px-4 py-6">
      {/* 메인 컨텐츠 — 중앙 고정 */}
      <div className="max-w-2xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">📈 {profile?.nickname}의 포트폴리오</h1>
          </div>
          <div className="flex gap-2">
            <Link href="/groups" className="text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg px-3 py-1.5 transition-colors">
              👥 그룹
            </Link>
            {isAdmin && (
              <Link href="/admin" className="text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg px-3 py-1.5 transition-colors">
                🛠️
              </Link>
            )}
            <button onClick={() => { signOut(); router.replace('/login') }} className="text-sm text-zinc-400 hover:text-zinc-200">
              로그아웃
            </button>
          </div>
        </div>

        {/* 총계 카드 */}
        <div className="bg-zinc-800 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-zinc-400">총 평가금액</p>
            <div className="flex gap-1.5">
              <button
                onClick={() => setHideAmounts(h => !h)}
                className="text-xs bg-zinc-700 hover:bg-zinc-600 rounded-full px-2 py-1 transition-colors"
                title="금액 숨기기"
              >
                {hideAmounts ? '👁' : '🙈'}
              </button>
              <button
                onClick={() => setCurrency(c => { const next = c === 'USD' ? 'KRW' : 'USD'; localStorage.setItem('currency', next); return next })}
                className="text-xs bg-zinc-700 hover:bg-zinc-600 rounded-full px-2 py-1 transition-colors font-semibold"
              >
                {currency === 'USD' ? '$ → ₩' : '₩ → $'}
              </button>
            </div>
          </div>
          <p className="text-3xl font-bold">{fmt(totalCurrent)}</p>
          <p className={`mt-1 text-sm font-semibold ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalPnl >= 0 ? '+' : ''}{fmt(totalPnl)}
            {' '}({totalPnlPct >= 0 ? '+' : ''}{totalPnlPct.toFixed(2)}%)
          </p>
          {currency === 'KRW' && (
            <p className="mt-1 text-xs text-zinc-500">환율 ₩{Math.round(exchangeRate).toLocaleString()}/$ 기준</p>
          )}
        </div>

        {/* 종목 목록 */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">보유 종목</h2>
          <button
            onClick={() => { setShowAdd(true); setSearchQuery(''); setSearchResults([]); setForm({ symbol: '', quantity: '', avg_price: '', total_invested: '' }); setSelectedPrice(null); setPriceMode('avg') }}
            className="text-sm bg-blue-600 hover:bg-blue-700 rounded-lg px-3 py-1.5 transition-colors"
          >
            + 추가
          </button>
        </div>

        {holdings.length === 0 ? (
          <div className="bg-zinc-800 rounded-xl p-8 text-center text-zinc-400 text-sm">
            보유 종목이 없습니다. 추가해보세요!
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {holdings.map(h => {
              const current = (h.quote?.price ?? h.avg_price) * h.quantity
              const invested = h.avg_price * h.quantity
              const pnl = current - invested
              const pnlPct = (pnl / invested) * 100
              return (
                <div
                  key={h.id}
                  className="bg-zinc-800 rounded-xl p-5 cursor-pointer hover:bg-zinc-750 hover:ring-1 hover:ring-zinc-600 transition-all"
                  onClick={() => { setEditingHolding(h); setEditForm({ quantity: String(h.quantity), avg_price: String(h.avg_price) }) }}
                >
                  {/* 상단: 종목명 + 오늘 등락 */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="text-lg font-bold tracking-wide">{h.symbol}</span>
                      {h.quote?.name && <p className="text-xs text-zinc-500 mt-0.5">{h.quote.name}</p>}
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-semibold px-2 py-0.5 rounded-full ${(h.quote?.changePercent ?? 0) >= 0 ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'}`}>
                        {(h.quote?.changePercent ?? 0) >= 0 ? '+' : ''}{h.quote?.changePercent?.toFixed(2) ?? '0'}%
                      </span>
                      <p className="text-xs text-zinc-600 mt-1">오늘</p>
                    </div>
                  </div>

                  {/* 하단: 평가금액 / 수익 */}
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-bold tabular-nums">
                        {fmt(current)}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {h.quantity}주 · 주가 {h.quote?.price ? fmt(h.quote.price) : '-'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-bold tabular-nums ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {pnl >= 0 ? '+' : ''}{fmt(pnl)}
                      </p>
                      <p className={`text-sm font-semibold ${pnl >= 0 ? 'text-green-400/70' : 'text-red-400/70'}`}>
                        {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 사이드바 — 메인 오른쪽 여백에 절대 위치 (xl 이상만) */}
      <div
        className="hidden xl:flex flex-col gap-4 fixed top-1/2 -translate-y-1/2 w-48"
        style={{ left: 'calc(50% + 352px)' }}
      >
        {/* 시계 */}
        <div className="bg-black border border-amber-900/60 rounded-xl p-4 shadow-lg shadow-amber-900/10 text-center">
          <p className="text-xs text-amber-700 mb-1 font-mono tracking-widest uppercase">KST</p>
          <p className="text-2xl font-bold font-mono text-amber-400 tracking-widest tabular-nums">{clock}</p>
        </div>

        {/* 전광판 환율 카드 */}
        <div className="bg-black border border-amber-900/60 rounded-xl p-4 shadow-lg shadow-amber-900/10">
          <p className="text-xs text-amber-700 mb-2 font-mono tracking-widest uppercase">USD / KRW</p>
          <div className="font-mono">
            <span className="text-2xl font-bold text-amber-400 tracking-tight">
              ₩{Math.round(exchangeRate).toLocaleString('ko-KR')}
            </span>
            <span
              className="ml-1 text-amber-400 text-xl"
              style={{ opacity: tickerBlink ? 1 : 0, transition: 'opacity 0.1s' }}
            >▮</span>
          </div>
          <p className="text-xs text-amber-900 mt-2 font-mono">
            1 USD = ₩{Math.round(exchangeRate).toLocaleString()}
          </p>
        </div>

        {/* 주요 지수 카드 */}
        <div className="bg-zinc-800/80 border border-zinc-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wide">주요 지수</p>
            <p className="text-xs text-zinc-600">전일比</p>
          </div>
          <div className="flex flex-col gap-3">
            {indices.map(idx => (
              <div key={idx.symbol} className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-zinc-300">{INDEX_LABELS[idx.symbol] ?? idx.symbol}</p>
                  <p className="text-sm font-bold font-mono">
                    {idx.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-semibold ${idx.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {idx.changePercent >= 0 ? '+' : ''}{idx.changePercent.toFixed(2)}%
                  </p>
                  <p className={`text-xs font-mono ${idx.change >= 0 ? 'text-green-400/70' : 'text-red-400/70'}`}>
                    {idx.change >= 0 ? '+' : ''}{idx.change.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
            {indices.length === 0 && (
              <p className="text-xs text-zinc-600">불러오는 중...</p>
            )}
          </div>
          <p className="text-xs text-zinc-700 mt-3 text-right">1분마다 갱신</p>
        </div>
      </div>

      {/* 종목 수정 모달 */}
      {editingHolding && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center px-4 z-50" onClick={() => setEditingHolding(null)}>
          <form onSubmit={handleEditSave} className="bg-zinc-800 rounded-xl p-6 w-full max-w-sm flex flex-col gap-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{editingHolding.symbol} 수정</h3>
              {editingHolding.quote?.price && (
                <span className="text-xs text-zinc-400">현재가 {fmt(editingHolding.quote.price)}</span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-zinc-400">수량 (주)</label>
              <input
                type="number"
                value={editForm.quantity}
                onChange={e => setEditForm(f => ({ ...f, quantity: e.target.value }))}
                required min="0.001" step="any"
                className="bg-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-zinc-400">평단가 ($)</label>
              <input
                type="number"
                value={editForm.avg_price}
                onChange={e => setEditForm(f => ({ ...f, avg_price: e.target.value }))}
                required min="0.01" step="any"
                className="bg-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => handleDelete(editingHolding.id)} className="bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg py-2 px-3 text-sm transition-colors">삭제</button>
              <button type="button" onClick={() => setEditingHolding(null)} className="flex-1 bg-zinc-700 hover:bg-zinc-600 rounded-lg py-2 text-sm transition-colors">취소</button>
              <button type="submit" disabled={editSaving} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg py-2 text-sm font-semibold transition-colors">
                {editSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 종목 추가 모달 */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center px-4 z-50">
          <form onSubmit={handleAddHolding} className="bg-zinc-800 rounded-xl p-6 w-full max-w-sm flex flex-col gap-4">
            <h3 className="font-semibold">종목 추가</h3>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-zinc-400">종목 검색</label>
              <input
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setForm(f => ({ ...f, symbol: '' })) }}
                placeholder="회사명 또는 티커 (예: Apple, NVDA)"
                className="bg-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              {(searchResults.length > 0 || searching) && (
                <div className="bg-zinc-700 rounded-lg overflow-hidden">
                  {searching && <p className="px-3 py-2 text-xs text-zinc-400">검색 중...</p>}
                  {searchResults.map(r => (
                    <button
                      key={r.symbol}
                      type="button"
                      onClick={async () => {
                        setForm(f => ({ ...f, symbol: r.symbol }))
                        setSearchQuery(`${r.symbol} - ${r.name}`)
                        setSearchResults([])
                        const res = await fetch(`/api/stocks?symbols=${r.symbol}`)
                        const data = await res.json()
                        if (data?.[0]?.price) setSelectedPrice(data[0].price)
                        else setSelectedPrice(null)
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-600 flex justify-between"
                    >
                      <span className="font-semibold">{r.symbol}</span>
                      <span className="text-zinc-400 text-xs truncate ml-2">{r.name}</span>
                    </button>
                  ))}
                </div>
              )}
              {form.symbol && (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-green-400">선택됨: {form.symbol}</p>
                  {selectedPrice !== null && (
                    <p className="text-xs text-zinc-400">현재가: <span className="text-white font-semibold">{fmt(selectedPrice)}</span></p>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-zinc-400">수량 (주)</label>
              <input
                type="number"
                value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                placeholder="예: 10"
                required
                min="0.001"
                step="any"
                className="bg-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {/* 입력 방식 선택 */}
            <div className="flex gap-1 bg-zinc-700 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setPriceMode('avg')}
                className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${priceMode === 'avg' ? 'bg-zinc-500 font-semibold' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                평단가 입력
              </button>
              <button
                type="button"
                onClick={() => setPriceMode('total')}
                className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${priceMode === 'total' ? 'bg-zinc-500 font-semibold' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                투자 원금 입력
              </button>
            </div>

            {priceMode === 'avg' ? (
              <div className="flex flex-col gap-1">
                <label className="text-sm text-zinc-400">매수 평단가 ($)</label>
                <input
                  type="number"
                  value={form.avg_price}
                  onChange={e => setForm(f => ({ ...f, avg_price: e.target.value }))}
                  placeholder="예: 260.00"
                  required
                  min="0.01"
                  step="any"
                  className="bg-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <label className="text-sm text-zinc-400">총 투자 원금 ($)</label>
                <input
                  type="number"
                  value={form.total_invested}
                  onChange={e => setForm(f => ({ ...f, total_invested: e.target.value }))}
                  placeholder="예: 3000.00"
                  required
                  min="0.01"
                  step="any"
                  className="bg-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
                {form.total_invested && form.quantity && (
                  <p className="text-xs text-zinc-400 mt-0.5">
                    → 평단가: <span className="text-white font-semibold">
                      ${(parseFloat(form.total_invested) / parseFloat(form.quantity)).toFixed(2)}
                    </span>
                  </p>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={() => { setShowAdd(false); setSearchQuery(''); setSearchResults([]); setSelectedPrice(null) }} className="flex-1 bg-zinc-700 hover:bg-zinc-600 rounded-lg py-2 text-sm transition-colors">취소</button>
              <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg py-2 text-sm font-semibold transition-colors">
                {saving ? '저장 중...' : '추가'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
