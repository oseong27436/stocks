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
  currency?: string
}

type HoldingWithQuote = Holding & { quote?: QuoteData }

const INDEX_LABELS: Record<string, string> = {
  '^GSPC': 'S&P 500',
  '^IXIC': 'NASDAQ',
  '^KS11': 'KOSPI',
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
  const [hideAmounts, setHideAmounts] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('hideAmounts') === 'true'
  )
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
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingStep, setOnboardingStep] = useState(0)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [analysisChartMode, setAnalysisChartMode] = useState<'bar' | 'pie'>('bar')
  const [mainTab, setMainTab] = useState<'holdings' | 'history'>('holdings')
  const [myHistory, setMyHistory] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyMode, setHistoryMode] = useState<'amount' | 'rate'>('amount')

  const fetchMyHistory = useCallback(async () => {
    setHistoryLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch(`/api/my-history?days=30`, {
      headers: { authorization: `Bearer ${session.access_token}` }
    })
    const data = await res.json()
    setMyHistory(Array.isArray(data) ? data : [])
    setHistoryLoading(false)
  }, [])

  const fetchMarketData = useCallback(async () => {
    const [rateRes, idxRes] = await Promise.all([
      fetch('/api/stocks?symbols=USDKRW=X'),
      fetch('/api/stocks?symbols=%5EGSPC,%5EIXIC,%5EKS11'),
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
      if (p?.hide_amounts) setHideAmounts(true)
      if (!localStorage.getItem('onboarding_seen')) setShowOnboarding(true)
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

  // 히스토리 탭 열릴 때 데이터 로드
  useEffect(() => {
    if (mainTab === 'history') fetchMyHistory()
  }, [mainTab, fetchMyHistory])

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
    setShowOnboarding(true)
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

  // KRW 종목의 avg_price는 DB에 원화로 저장됨 → USD로 환산해서 비교
  const avgPriceUsd = (h: HoldingWithQuote) =>
    h.quote?.currency === 'KRW' && exchangeRate > 1
      ? h.avg_price / exchangeRate
      : h.avg_price
  const totalInvested = holdings.reduce((s, h) => s + avgPriceUsd(h) * h.quantity, 0)
  const totalCurrent = holdings.reduce((s, h) => s + (h.quote?.price ?? avgPriceUsd(h)) * h.quantity, 0)
  const totalPnl = totalCurrent - totalInvested
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0
  const totalDailyChange = holdings.reduce((s, h) => s + (h.quote?.change ?? 0) * h.quantity, 0)
  const totalDailyChangePct = totalCurrent > 0 ? (totalDailyChange / (totalCurrent - totalDailyChange)) * 100 : 0
  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
        <span className="text-zinc-500 text-sm">로딩 중...</span>
      </div>
    </div>
  )

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
      <div className="max-w-2xl mx-auto fade-in">
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
        <div className="bg-zinc-800 rounded-xl p-5 mb-4 cursor-pointer hover:bg-zinc-700/60 transition-colors" onClick={() => holdings.length > 0 && setShowAnalysis(true)}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-zinc-400">총 평가금액</p>
            <div className="flex gap-1.5">
              <button
                onClick={async () => {
                  const next = !hideAmounts
                  setHideAmounts(next)
                  const { data: s } = await supabase.auth.getSession()
                  if (s.session) await supabase.from('user_profiles').update({ hide_amounts: next }).eq('id', s.session.user.id)
                }}
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
          <div className="mt-2 flex items-center gap-3">
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">오늘</p>
              <p className={`text-sm font-semibold ${totalDailyChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {totalDailyChange >= 0 ? '+' : ''}{fmt(totalDailyChange)}
                {' '}({totalDailyChangePct >= 0 ? '+' : ''}{totalDailyChangePct.toFixed(2)}%)
              </p>
            </div>
            <div className="w-px h-8 bg-zinc-700" />
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">총 손익</p>
              <p className={`text-sm font-semibold ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {totalPnl >= 0 ? '+' : ''}{fmt(totalPnl)}
                {' '}({totalPnlPct >= 0 ? '+' : ''}{totalPnlPct.toFixed(2)}%)
              </p>
            </div>
          </div>
          {currency === 'KRW' && (
            <p className="mt-2 text-xs text-zinc-500">환율 ₩{Math.round(exchangeRate).toLocaleString()}/$ 기준</p>
          )}
        </div>

        {/* 모바일 시장 데이터 — xl 이상에서 숨김 */}
        <div className="xl:hidden mb-4 -mx-4 px-4">
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {/* 환율 */}
            <div className="flex-shrink-0 bg-black border border-amber-900/60 rounded-xl px-3 py-2.5">
              <p className="text-xs text-amber-700 font-mono tracking-wider">USD/KRW</p>
              <p className="text-sm font-bold font-mono text-amber-400">₩{Math.round(exchangeRate).toLocaleString()}</p>
            </div>
            {/* 주요 지수 */}
            {indices.length === 0 && [1,2,3].map(i => (
              <div key={i} className="flex-shrink-0 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 flex flex-col gap-1.5">
                <div className="h-2.5 w-12 skeleton" />
                <div className="h-4 w-16 skeleton" />
                <div className="h-2.5 w-10 skeleton" />
              </div>
            ))}
            {indices.map(idx => (
              <div key={idx.symbol} className="flex-shrink-0 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5">
                <p className="text-xs text-zinc-500">{INDEX_LABELS[idx.symbol] ?? idx.symbol}</p>
                <p className="text-sm font-bold font-mono">
                  {idx.price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
                <p className={`text-xs font-semibold ${idx.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {idx.changePercent >= 0 ? '+' : ''}{idx.changePercent.toFixed(2)}%
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 탭 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-1 bg-zinc-800 rounded-lg p-1">
            <button
              onClick={() => setMainTab('holdings')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${mainTab === 'holdings' ? 'bg-zinc-600 font-semibold' : 'text-zinc-400 hover:text-zinc-200'}`}
            >보유 종목</button>
            <button
              onClick={() => setMainTab('history')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${mainTab === 'history' ? 'bg-zinc-600 font-semibold' : 'text-zinc-400 hover:text-zinc-200'}`}
            >내 히스토리</button>
          </div>
          {mainTab === 'holdings' && (
            <button
              onClick={() => { setShowAdd(true); setSearchQuery(''); setSearchResults([]); setForm({ symbol: '', quantity: '', avg_price: '', total_invested: '' }); setSelectedPrice(null); setPriceMode('avg') }}
              className="text-sm bg-blue-600 hover:bg-blue-700 rounded-lg px-3 py-1.5 transition-colors"
            >+ 추가</button>
          )}
        </div>

        {mainTab === 'history' ? (
          <div>
            {/* 수익/수익률 토글 */}
            <div className="flex gap-1 mb-4 bg-zinc-800 rounded-lg p-1 w-fit">
              <button
                onClick={() => setHistoryMode('amount')}
                className={`text-xs px-3 py-1.5 rounded-md transition-colors ${historyMode === 'amount' ? 'bg-zinc-600 font-semibold text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
              >수익</button>
              <button
                onClick={() => setHistoryMode('rate')}
                className={`text-xs px-3 py-1.5 rounded-md transition-colors ${historyMode === 'rate' ? 'bg-zinc-600 font-semibold text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
              >수익률</button>
            </div>
            {historyLoading ? (
              <div className="flex flex-col gap-3">
                {[1,2,3,4,5,6,7].map(i => (
                  <div key={i} className="bg-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between">
                    <div className="flex flex-col gap-1.5">
                      <div className="h-3 w-20 skeleton" />
                      <div className="h-3.5 w-32 skeleton" />
                    </div>
                    <div className="h-5 w-24 skeleton" />
                  </div>
                ))}
              </div>
            ) : myHistory.length === 0 ? (
              <div className="bg-zinc-800 rounded-xl p-8 text-center text-zinc-400 text-sm">
                아직 히스토리가 없어요.<br />
                <span className="text-xs text-zinc-600 mt-1 block">매일 자동 저장됩니다.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {myHistory.map((snap, i) => {
                  const date = new Date(snap.date)
                  const label = date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
                  const isFirst = i === myHistory.length - 1
                  const prevValue = snap.totalValue - snap.dailyChange
                  const dailyChangePct = prevValue > 0 ? (snap.dailyChange / prevValue) * 100 : 0
                  const hasDaily = !isFirst
                  return (
                    <div key={snap.date} className={`card-in bg-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between ${isFirst ? 'opacity-60' : ''}`} style={{ animationDelay: `${i * 40}ms` }}>
                      <div>
                        <p className="text-xs text-zinc-500 mb-0.5">{label}</p>
                        <p className="text-sm font-semibold">{fmt(snap.totalValue)}</p>
                      </div>
                      <div className="text-right">
                        {hasDaily && historyMode === 'amount' && (
                          <p className={`text-base font-bold ${snap.dailyChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {snap.dailyChange >= 0 ? '+' : ''}{fmt(snap.dailyChange)}
                          </p>
                        )}
                        {hasDaily && historyMode === 'rate' && (
                          <p className={`text-base font-bold ${dailyChangePct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {dailyChangePct >= 0 ? '+' : ''}{dailyChangePct.toFixed(2)}%
                          </p>
                        )}
                        {!hasDaily && (
                          <p className="text-xs text-zinc-600">기준일</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : holdings.length === 0 ? (
          <div className="bg-zinc-800 rounded-xl p-8 text-center">
            <div className="text-5xl mb-4">📊</div>
            <h3 className="font-semibold text-base mb-1">아직 보유 종목이 없어요</h3>
            <p className="text-sm text-zinc-400 mb-5">첫 종목을 추가해서 포트폴리오를 시작해보세요.</p>
            <button
              onClick={() => { setShowAdd(true); setSearchQuery(''); setSearchResults([]); setForm({ symbol: '', quantity: '', avg_price: '', total_invested: '' }); setSelectedPrice(null); setPriceMode('avg') }}
              className="bg-blue-600 hover:bg-blue-700 rounded-lg px-5 py-2 text-sm font-semibold transition-colors mb-8"
            >
              + 첫 종목 추가하기
            </button>
            <div className="grid grid-cols-3 gap-3 text-xs text-zinc-500 border-t border-zinc-700 pt-6">
              <div className="flex flex-col items-center gap-2">
                <span className="text-2xl">🔍</span>
                <p className="font-semibold text-zinc-300">티커·회사명 검색</p>
                <p>AAPL, 애플, NVDA 등<br />뭐든 검색 가능해요</p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="text-2xl">👥</span>
                <p className="font-semibold text-zinc-300">그룹 수익률 비교</p>
                <p>친구들과 그룹을 만들어<br />수익률을 겨뤄보세요</p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="text-2xl">📅</span>
                <p className="font-semibold text-zinc-300">히스토리 추적</p>
                <p>매일 자동 저장되는<br />수익률 변화 그래프</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {holdings.map((h, i) => {
              const avgUsd = avgPriceUsd(h)
              const current = (h.quote?.price ?? avgUsd) * h.quantity
              const invested = avgUsd * h.quantity
              const pnl = current - invested
              const pnlPct = (pnl / invested) * 100
              return (
                <div
                  key={h.id}
                  className="card-in bg-zinc-800 rounded-xl p-5 cursor-pointer hover:bg-zinc-700/60 hover:ring-1 hover:ring-zinc-600 transition-all"
                  style={{ animationDelay: `${i * 60}ms` }}
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
              <div className="flex flex-col gap-3">
                {[1,2,3].map(i => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <div className="h-2.5 w-14 skeleton" />
                      <div className="h-3.5 w-20 skeleton" />
                    </div>
                    <div className="h-3 w-12 skeleton" />
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-zinc-700 mt-3 text-right">1분마다 갱신</p>
        </div>
      </div>

      {/* 포트폴리오 분석 모달 */}
      {showAnalysis && holdings.length > 0 && (() => {
        const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#6366f1','#84cc16']
        const sorted = [...holdings].sort((a, b) => {
          const av = (a.quote?.price ?? a.avg_price) * a.quantity
          const bv = (b.quote?.price ?? b.avg_price) * b.quantity
          return bv - av
        })
        const byPnlPct = [...holdings].sort((a, b) => {
          const ap = ((a.quote?.price ?? a.avg_price) - a.avg_price) / a.avg_price * 100
          const bp = ((b.quote?.price ?? b.avg_price) - b.avg_price) / b.avg_price * 100
          return bp - ap
        })
        return (
          <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 px-0 sm:px-4" onClick={() => setShowAnalysis(false)}>
            <div className="bg-zinc-800 rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="p-5">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-bold text-lg">포트폴리오 분석</h2>
                  <button onClick={() => setShowAnalysis(false)} className="text-zinc-400 hover:text-zinc-200 text-xl">×</button>
                </div>

                {/* 투자원금 vs 평가금액 */}
                <div className="bg-zinc-700/50 rounded-xl p-4 mb-5 flex gap-4">
                  <div className="flex-1">
                    <p className="text-xs text-zinc-400 mb-0.5">투자 원금</p>
                    <p className="text-base font-bold">{fmt(totalInvested)}</p>
                  </div>
                  <div className="w-px bg-zinc-600" />
                  <div className="flex-1">
                    <p className="text-xs text-zinc-400 mb-0.5">현재 평가금액</p>
                    <p className="text-base font-bold">{fmt(totalCurrent)}</p>
                  </div>
                  <div className="w-px bg-zinc-600" />
                  <div className="flex-1">
                    <p className="text-xs text-zinc-400 mb-0.5">총 손익</p>
                    <p className={`text-base font-bold ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {totalPnl >= 0 ? '+' : ''}{fmt(totalPnl)}
                    </p>
                  </div>
                </div>

                {/* 종목별 비중 */}
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wide">종목 비중</p>
                  <div className="flex gap-1 bg-zinc-700 rounded-lg p-0.5">
                    <button
                      onClick={() => setAnalysisChartMode('bar')}
                      className={`text-xs px-2.5 py-1 rounded-md transition-colors ${analysisChartMode === 'bar' ? 'bg-zinc-500 text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'}`}
                    >막대</button>
                    <button
                      onClick={() => setAnalysisChartMode('pie')}
                      className={`text-xs px-2.5 py-1 rounded-md transition-colors ${analysisChartMode === 'pie' ? 'bg-zinc-500 text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'}`}
                    >원형</button>
                  </div>
                </div>
                {analysisChartMode === 'bar' ? (
                  <div className="flex flex-col gap-2.5 mb-5">
                    {sorted.map((h, i) => {
                      const val = (h.quote?.price ?? h.avg_price) * h.quantity
                      const pct = totalCurrent > 0 ? (val / totalCurrent) * 100 : 0
                      return (
                        <div key={h.id}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                              <span className="text-sm font-semibold">{h.symbol}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-zinc-400">
                              <span>{fmt(val)}</span>
                              <span className="font-semibold text-zinc-200 w-10 text-right">{pct.toFixed(1)}%</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (() => {
                  // SVG 도넛 차트
                  const cx = 100, cy = 100, outerR = 85, innerR = 55
                  const toRad = (deg: number) => (deg - 90) * Math.PI / 180
                  let cumAngle = 0
                  const slices = sorted.map((h, i) => {
                    const val = (h.quote?.price ?? h.avg_price) * h.quantity
                    const pct = totalCurrent > 0 ? val / totalCurrent : 0
                    const angle = pct * 360
                    const startAngle = cumAngle
                    const endAngle = cumAngle + angle
                    cumAngle = endAngle
                    const largeArc = angle > 180 ? 1 : 0
                    const x1 = cx + outerR * Math.cos(toRad(startAngle))
                    const y1 = cy + outerR * Math.sin(toRad(startAngle))
                    const x2 = cx + outerR * Math.cos(toRad(endAngle - 0.01))
                    const y2 = cy + outerR * Math.sin(toRad(endAngle - 0.01))
                    const x3 = cx + innerR * Math.cos(toRad(endAngle - 0.01))
                    const y3 = cy + innerR * Math.sin(toRad(endAngle - 0.01))
                    const x4 = cx + innerR * Math.cos(toRad(startAngle))
                    const y4 = cy + innerR * Math.sin(toRad(startAngle))
                    const d = `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z`
                    return { h, pct, d, color: COLORS[i % COLORS.length] }
                  })
                  return (
                    <div className="mb-5">
                      <div className="flex items-center gap-5">
                        <svg viewBox="0 0 200 200" className="w-36 h-36 flex-shrink-0">
                          {slices.map((s, i) => (
                            <path key={i} d={s.d} fill={s.color} opacity={0.9} />
                          ))}
                        </svg>
                        <div className="flex flex-col gap-1.5 min-w-0">
                          {slices.map((s, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                              <span className="font-semibold text-zinc-200 truncate">{s.h.symbol}</span>
                              <span className="text-zinc-400 ml-auto pl-2">{(s.pct * 100).toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* 수익률 순위 */}
                <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wide mb-3">수익률 순위</p>
                <div className="flex flex-col gap-2">
                  {byPnlPct.map((h, i) => {
                    const avgUsd2 = avgPriceUsd(h)
                    const pnlPct = ((h.quote?.price ?? avgUsd2) - avgUsd2) / avgUsd2 * 100
                    const pnlAmt = ((h.quote?.price ?? avgUsd2) - avgUsd2) * h.quantity
                    return (
                      <div key={h.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-500 w-5 text-xs">{i + 1}.</span>
                          <span className="font-semibold">{h.symbol}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs ${pnlAmt >= 0 ? 'text-green-400/70' : 'text-red-400/70'}`}>{pnlAmt >= 0 ? '+' : ''}{fmt(pnlAmt)}</span>
                          <span className={`font-bold w-16 text-right ${pnlPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )
      })()}

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

      {/* 온보딩 모달 */}
      {showOnboarding && (() => {
        const steps = [
          {
            icon: '👋',
            title: `${profile?.nickname}님, 환영합니다!`,
            desc: '이 앱은 해외 주식 포트폴리오를 간단하게 관리하고, 친구들과 수익률을 비교할 수 있는 서비스예요.',
            sub: '3단계로 빠르게 시작해볼게요.',
          },
          {
            icon: '📈',
            title: '종목을 추가해보세요',
            desc: '티커(AAPL) 또는 회사명(애플)으로 검색하고, 보유 수량과 평단가를 입력하면 바로 수익률을 볼 수 있어요.',
            sub: '평단가를 모르면 총 투자 원금으로도 입력할 수 있어요.',
          },
          {
            icon: '👥',
            title: '그룹에서 친구와 비교해요',
            desc: '그룹을 만들고 ID를 공유하면 친구들과 실시간 수익률 랭킹을 볼 수 있어요.',
            sub: '금액 숨기기를 켜면 다른 사람에게 내 금액이 ••••••으로 보여요.',
          },
        ]
        const step = steps[onboardingStep]
        const isLast = onboardingStep === steps.length - 1
        function close() {
          localStorage.setItem('onboarding_seen', 'true')
          setShowOnboarding(false)
          setOnboardingStep(0)
        }
        return (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center px-4 z-50">
            <div className="bg-zinc-800 rounded-2xl p-7 w-full max-w-sm flex flex-col gap-5 shadow-2xl">
              {/* 진행 점 */}
              <div className="flex justify-center gap-1.5">
                {steps.map((_, i) => (
                  <div key={i} className={`h-1.5 rounded-full transition-all ${i === onboardingStep ? 'w-6 bg-blue-500' : 'w-1.5 bg-zinc-600'}`} />
                ))}
              </div>
              {/* 내용 */}
              <div className="text-center">
                <div className="text-5xl mb-4">{step.icon}</div>
                <h2 className="text-lg font-bold mb-2">{step.title}</h2>
                <p className="text-sm text-zinc-300 leading-relaxed mb-2">{step.desc}</p>
                {step.sub && <p className="text-xs text-zinc-500">{step.sub}</p>}
              </div>
              {/* 버튼 */}
              <div className="flex gap-2">
                <button onClick={close} className="text-xs text-zinc-500 hover:text-zinc-300 px-3 py-2 transition-colors">
                  건너뛰기
                </button>
                <button
                  onClick={() => isLast ? close() : setOnboardingStep(s => s + 1)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 rounded-lg py-2.5 text-sm font-semibold transition-colors"
                >
                  {isLast ? '시작하기 🚀' : '다음 →'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

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
