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

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [holdings, setHoldings] = useState<HoldingWithQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ symbol: '', quantity: '', avg_price: '' })
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ symbol: string; name: string }[]>([])
  const [searching, setSearching] = useState(false)
  const [currency, setCurrency] = useState<'USD' | 'KRW'>('USD')
  const [exchangeRate, setExchangeRate] = useState<number>(1)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showNickname, setShowNickname] = useState(false)
  const [nickname, setNickname] = useState('')
  const [nicknameSaving, setNicknameSaving] = useState(false)
  const [pendingUserId, setPendingUserId] = useState('')

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
      const [h, rateRes] = await Promise.all([
        fetchHoldings(userId),
        fetch('/api/stocks?symbols=USDKRW=X'),
      ])
      const rateData = await rateRes.json()
      if (rateData?.[0]?.price) setExchangeRate(rateData[0].price)
      setHoldings(h)
      setLoading(false)
    })
  }, [router, fetchHoldings])

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
    await supabase.from('holdings').insert({
      user_id: session.session.user.id,
      symbol: form.symbol.toUpperCase(),
      quantity: parseFloat(form.quantity),
      avg_price: parseFloat(form.avg_price),
    })
    const h = await fetchHoldings(session.session.user.id)
    setHoldings(h)
    setForm({ symbol: '', quantity: '', avg_price: '' })
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
    const [h, rateRes] = await Promise.all([
      fetchHoldings(pendingUserId),
      fetch('/api/stocks?symbols=USDKRW=X'),
    ])
    const rateData = await rateRes.json()
    if (rateData?.[0]?.price) setExchangeRate(rateData[0].price)
    setHoldings(h)
    setNicknameSaving(false)
  }

  async function handleDelete(id: string) {
    await supabase.from('holdings').delete().eq('id', id)
    setHoldings(prev => prev.filter(h => h.id !== id))
  }

  const rate = currency === 'KRW' ? exchangeRate : 1
  const fmt = (usd: number) => currency === 'KRW'
    ? '₩' + Math.round(usd * rate).toLocaleString('ko-KR')
    : '$' + usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

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
    <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto">
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
          <button
            onClick={() => setCurrency(c => c === 'USD' ? 'KRW' : 'USD')}
            className="text-xs bg-zinc-700 hover:bg-zinc-600 rounded-full px-2 py-1 transition-colors font-semibold"
          >
            {currency === 'USD' ? '$ → ₩' : '₩ → $'}
          </button>
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
        <button onClick={() => { setShowAdd(true); setSearchQuery(''); setSearchResults([]); setForm({ symbol: '', quantity: '', avg_price: '' }) }} className="text-sm bg-blue-600 hover:bg-blue-700 rounded-lg px-3 py-1.5 transition-colors">
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
              <div key={h.id} className="bg-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-bold">{h.symbol}</span>
                    {h.quote?.name && <span className="ml-2 text-xs text-zinc-400">{h.quote.name}</span>}
                  </div>
                  <button onClick={() => handleDelete(h.id)} className="text-xs text-zinc-500 hover:text-red-400">삭제</button>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-lg font-semibold">
                      {h.quote?.price ? fmt(h.quote.price) : '-'}
                    </p>
                    <p className={`text-xs ${(h.quote?.changePercent ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      오늘 {(h.quote?.changePercent ?? 0) >= 0 ? '+' : ''}{h.quote?.changePercent?.toFixed(2) ?? '0'}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-zinc-300">{h.quantity}주 · 평단 {fmt(h.avg_price)}</p>
                    <p className={`text-sm font-semibold ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {pnl >= 0 ? '+' : ''}{fmt(pnl)} ({pnlPct.toFixed(2)}%)
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
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
                      onClick={() => { setForm(f => ({ ...f, symbol: r.symbol })); setSearchQuery(`${r.symbol} - ${r.name}`); setSearchResults([]) }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-600 flex justify-between"
                    >
                      <span className="font-semibold">{r.symbol}</span>
                      <span className="text-zinc-400 text-xs truncate ml-2">{r.name}</span>
                    </button>
                  ))}
                </div>
              )}
              {form.symbol && <p className="text-xs text-green-400">선택됨: {form.symbol}</p>}
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
            <div className="flex flex-col gap-1">
              <label className="text-sm text-zinc-400">평단가 ($)</label>
              <input
                type="number"
                value={form.avg_price}
                onChange={e => setForm(f => ({ ...f, avg_price: e.target.value }))}
                placeholder="예: 800.00"
                required
                min="0.01"
                step="any"
                className="bg-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setShowAdd(false); setSearchQuery(''); setSearchResults([]) }} className="flex-1 bg-zinc-700 hover:bg-zinc-600 rounded-lg py-2 text-sm transition-colors">취소</button>
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
