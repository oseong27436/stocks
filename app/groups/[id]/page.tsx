'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase, Holding, UserProfile } from '@/lib/supabase'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend
} from 'recharts'

type MemberSummary = {
  profile: UserProfile
  holdings: Holding[]
  totalInvested: number
  totalCurrent: number
  pnl: number
  pnlPct: number
  dailyPnl: number
  hideAmounts: boolean
}

type HistoryEntry = {
  userId: string
  nickname: string
  data: { date: string; pnlPct: number; totalValue: number }[]
}

const LINE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']

export default function GroupDetailPage() {
  const router = useRouter()
  const params = useParams()
  const groupId = params.id as string

  const [groupName, setGroupName] = useState('')
  const [members, setMembers] = useState<MemberSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [myId, setMyId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [tab, setTab] = useState<'now' | 'history'>('now')
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyDays, setHistoryDays] = useState(30)
  const [currency, setCurrency] = useState<'USD' | 'KRW'>(() =>
    (typeof window !== 'undefined' && localStorage.getItem('currency') as 'USD' | 'KRW') || 'USD'
  )
  const [hideAmounts, setHideAmounts] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('hideAmounts') === 'true'
  )
  const [exchangeRate, setExchangeRate] = useState<number>(1)
  const [token, setToken] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const t = data.session.access_token
      setToken(t)
      setMyId(data.session.user.id)

      const { data: group } = await supabase.from('groups').select('name').eq('id', groupId).single()
      setGroupName(group?.name ?? '')

      const { data: memberRows } = await supabase
        .from('group_members').select('user_id').eq('group_id', groupId)
      if (!memberRows) { setLoading(false); return }

      const [rateRes] = await Promise.all([fetch('/api/stocks?symbols=USDKRW=X')])
      const rateData = await rateRes.json()
      if (rateData?.[0]?.price) setExchangeRate(rateData[0].price)

      const userIds = memberRows.map((m: any) => m.user_id)
      const { data: profiles } = await supabase.from('user_profiles').select('*').in('id', userIds)

      const summaries: MemberSummary[] = []
      for (const profile of profiles ?? []) {
        const { data: holdings } = await supabase.from('holdings').select('*').eq('user_id', profile.id)
        const h = holdings ?? []
        let totalInvested = 0, totalCurrent = 0, dailyPnl = 0
        if (h.length > 0) {
          const symbols = h.map((x: Holding) => x.symbol).join(',')
          const res = await fetch(`/api/stocks?symbols=${symbols}`)
          const quotes = await res.json()
          h.forEach((holding: Holding) => {
            const q = quotes.find((x: any) => x.symbol === holding.symbol)
            totalInvested += holding.avg_price * holding.quantity
            totalCurrent += (q?.price ?? holding.avg_price) * holding.quantity
            dailyPnl += (q?.change ?? 0) * holding.quantity
          })
        }
        const pnl = totalCurrent - totalInvested
        const pnlPct = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0
        summaries.push({ profile, holdings: h, totalInvested, totalCurrent, pnl, pnlPct, dailyPnl, hideAmounts: !!(profile as any).hide_amounts })
      }
      summaries.sort((a, b) => b.pnlPct - a.pnlPct)
      setMembers(summaries)
      setLoading(false)
    })
  }, [groupId, router])

  useEffect(() => {
    if (tab !== 'history' || !token) return
    setHistoryLoading(true)
    fetch(`/api/history?group_id=${groupId}&days=${historyDays}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => { setHistory(data); setHistoryLoading(false) })
  }, [tab, groupId, token, historyDays])

  function toggleCurrency() {
    const next = currency === 'USD' ? 'KRW' : 'USD'
    localStorage.setItem('currency', next)
    setCurrency(next)
  }

  function copyGroupId() {
    navigator.clipboard.writeText(groupId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const rate = currency === 'KRW' ? exchangeRate : 1
  const fmtRaw = (usd: number) => currency === 'KRW'
    ? '₩' + Math.round(usd * rate).toLocaleString('ko-KR')
    : '$' + usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const fmt = (usd: number) => hideAmounts ? '••••••' : fmtRaw(usd)

  function toggleHide() {
    const next = !hideAmounts
    localStorage.setItem('hideAmounts', String(next))
    setHideAmounts(next)
  }

  // 차트용 날짜별 데이터 변환
  const chartData = (() => {
    if (history.length === 0) return []
    const allDates = [...new Set(history.flatMap(u => u.data.map(d => d.date)))].sort()
    return allDates.map(date => {
      const row: Record<string, any> = { date: date.slice(5) } // MM-DD
      for (const user of history) {
        const snap = user.data.find(d => d.date === date)
        if (snap) row[user.nickname] = parseFloat(snap.pnlPct.toFixed(2))
      }
      return row
    })
  })()

  // 날짜별 랭킹 테이블
  const rankingDates = (() => {
    if (history.length === 0) return []
    const allDates = [...new Set(history.flatMap(u => u.data.map(d => d.date)))].sort().reverse()
    return allDates.map(date => {
      const row = history
        .map(u => ({ nickname: u.nickname, ...u.data.find(d => d.date === date) }))
        .filter(r => r.date)
        .sort((a, b) => (b.pnlPct ?? 0) - (a.pnlPct ?? 0))
      return { date, rows: row }
    })
  })()
  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
        <span className="text-zinc-500 text-sm">로딩 중...</span>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto fade-in">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/groups" className="text-zinc-400 hover:text-zinc-200 text-sm">← 그룹</Link>
          <h1 className="text-xl font-bold">{groupName}</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={toggleHide} className="text-xs bg-zinc-800 hover:bg-zinc-700 rounded-full px-2 py-1 transition-colors" title="금액 숨기기">
            {hideAmounts ? '👁' : '🙈'}
          </button>
          <button onClick={toggleCurrency} className="text-xs bg-zinc-800 hover:bg-zinc-700 rounded-full px-2 py-1 transition-colors font-semibold">
            {currency === 'USD' ? '$ → ₩' : '₩ → $'}
          </button>
          <button onClick={copyGroupId} className="text-xs bg-zinc-800 hover:bg-zinc-700 rounded-lg px-3 py-1.5 transition-colors">
            {copied ? '✅ 복사됨' : '🔗 ID 복사'}
          </button>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 bg-zinc-800 rounded-lg p-1 mb-6">
        <button
          onClick={() => setTab('now')}
          className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${tab === 'now' ? 'bg-zinc-600 font-semibold' : 'text-zinc-400 hover:text-zinc-200'}`}
        >
          현재 랭킹
        </button>
        <button
          onClick={() => setTab('history')}
          className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${tab === 'history' ? 'bg-zinc-600 font-semibold' : 'text-zinc-400 hover:text-zinc-200'}`}
        >
          히스토리
        </button>
      </div>

      {/* 현재 랭킹 탭 */}
      {tab === 'now' && (
        <>
          <p className="text-xs text-zinc-500 mb-4">친구에게 그룹 ID를 공유해서 초대하세요.</p>
          <div className="flex flex-col gap-3">
            {members.map((m, i) => (
              <div key={m.profile.id} className={`card-in bg-zinc-800 rounded-xl p-4 ${m.profile.id === myId ? 'ring-1 ring-blue-500' : ''}`} style={{ animationDelay: `${i * 70}ms` }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}위`}</span>
                    <span className="font-semibold">{m.profile.nickname}</span>
                    {m.profile.id === myId && <span className="text-xs text-blue-400">(나)</span>}
                  </div>
                  <p className={`text-sm font-bold ${m.pnlPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {m.pnlPct >= 0 ? '+' : ''}{m.pnlPct.toFixed(2)}%
                  </p>
                </div>
                <div className="flex gap-4 text-sm">
                  <div>
                    <p className="text-xs text-zinc-500">총 수익</p>
                    <p className={`font-semibold ${m.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {m.hideAmounts ? '••••••' : `${m.pnl >= 0 ? '+' : ''}${fmt(m.pnl)}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">오늘 수익</p>
                    <p className={`font-semibold ${m.dailyPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {m.hideAmounts ? '••••••' : `${m.dailyPnl >= 0 ? '+' : ''}${fmt(m.dailyPnl)}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">평가금액</p>
                    <p className="font-semibold">{m.hideAmounts ? '••••••' : fmt(m.totalCurrent)}</p>
                  </div>
                </div>
                {m.holdings.length > 0 && (
                  <p className="mt-2 text-xs text-zinc-500">{m.holdings.map((h: Holding) => h.symbol).join(', ')}</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* 히스토리 탭 */}
      {tab === 'history' && (
        <div>
          {/* 기간 선택 */}
          <div className="flex gap-2 mb-5">
            {[7, 14, 30].map(d => (
              <button
                key={d}
                onClick={() => setHistoryDays(d)}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${historyDays === d ? 'bg-blue-600 font-semibold' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
              >
                {d}일
              </button>
            ))}
          </div>

          {historyLoading ? (
            <div className="flex flex-col gap-3">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="bg-zinc-800 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-6 skeleton" />
                    <div className="h-4 w-24 skeleton" />
                  </div>
                  <div className="h-4 w-16 skeleton" />
                </div>
              ))}
            </div>
          ) : chartData.length === 0 ? (
            <div className="bg-zinc-800 rounded-xl p-8 text-center text-zinc-400 text-sm">
              아직 히스토리가 없어요.<br />
              <span className="text-xs text-zinc-600 mt-1 block">매일 장 마감 후 자동 저장됩니다.</span>
            </div>
          ) : (
            <>
              {/* 수익률 차트 */}
              <div className="bg-zinc-800 rounded-xl p-4 mb-5">
                <p className="text-sm font-semibold mb-4">수익률 추이 (%)</p>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#71717a' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#71717a' }} unit="%" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#27272a', border: 'none', borderRadius: 8, fontSize: 12 }}
                      formatter={(v: any) => [`${Number(v) >= 0 ? '+' : ''}${v}%`]}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <ReferenceLine y={0} stroke="#52525b" strokeDasharray="3 3" />
                    {history.map((u, i) => (
                      <Line
                        key={u.userId}
                        type="monotone"
                        dataKey={u.nickname}
                        stroke={LINE_COLORS[i % LINE_COLORS.length]}
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* 날짜별 랭킹 테이블 */}
              <div className="flex flex-col gap-3">
                {rankingDates.map(({ date, rows }) => (
                  <div key={date} className="bg-zinc-800 rounded-xl p-4">
                    <p className="text-xs text-zinc-500 mb-2">
                      {new Date(date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {rows.map((r, i) => (
                        <div key={r.nickname} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
                            <span className={r.nickname === members.find(m => m.profile.id === myId)?.profile.nickname ? 'text-blue-400 font-semibold' : ''}>{r.nickname}</span>
                          </div>
                          <span className={`font-semibold ${(r.pnlPct ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {(r.pnlPct ?? 0) >= 0 ? '+' : ''}{(r.pnlPct ?? 0).toFixed(2)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
