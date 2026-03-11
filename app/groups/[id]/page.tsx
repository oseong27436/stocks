'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase, Holding, UserProfile } from '@/lib/supabase'

type MemberSummary = {
  profile: UserProfile
  holdings: Holding[]
  totalInvested: number
  totalCurrent: number
  pnl: number
  pnlPct: number
  dailyPnl: number
}

export default function GroupDetailPage() {
  const router = useRouter()
  const params = useParams()
  const groupId = params.id as string

  const [groupName, setGroupName] = useState('')
  const [members, setMembers] = useState<MemberSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [myId, setMyId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [currency, setCurrency] = useState<'USD' | 'KRW'>(() =>
    (typeof window !== 'undefined' && localStorage.getItem('currency') as 'USD' | 'KRW') || 'USD'
  )
  const [exchangeRate, setExchangeRate] = useState<number>(1)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      setMyId(data.session.user.id)

      const { data: group } = await supabase.from('groups').select('name').eq('id', groupId).single()
      setGroupName(group?.name ?? '')

      const { data: memberRows } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId)
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

        let totalInvested = 0
        let totalCurrent = 0
        let dailyPnl = 0

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

        summaries.push({ profile, holdings: h, totalInvested, totalCurrent, pnl, pnlPct, dailyPnl })
      }

      summaries.sort((a, b) => b.pnlPct - a.pnlPct)
      setMembers(summaries)
      setLoading(false)
    })
  }, [groupId, router])

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
  const fmt = (usd: number) => currency === 'KRW'
    ? '₩' + Math.round(usd * rate).toLocaleString('ko-KR')
    : '$' + usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  if (loading) return <div className="flex min-h-screen items-center justify-center text-zinc-400">로딩 중...</div>

  return (
    <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/groups" className="text-zinc-400 hover:text-zinc-200 text-sm">← 그룹</Link>
          <h1 className="text-xl font-bold">{groupName}</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={toggleCurrency}
            className="text-xs bg-zinc-800 hover:bg-zinc-700 rounded-full px-2 py-1 transition-colors font-semibold"
          >
            {currency === 'USD' ? '$ → ₩' : '₩ → $'}
          </button>
          <button onClick={copyGroupId} className="text-xs bg-zinc-800 hover:bg-zinc-700 rounded-lg px-3 py-1.5 transition-colors">
            {copied ? '✅ 복사됨' : '🔗 ID 복사'}
          </button>
        </div>
      </div>

      <p className="text-xs text-zinc-500 mb-6">친구에게 그룹 ID를 공유해서 초대하세요.</p>

      <div className="flex flex-col gap-3">
        {members.map((m, i) => (
          <div key={m.profile.id} className={`bg-zinc-800 rounded-xl p-4 ${m.profile.id === myId ? 'ring-1 ring-blue-500' : ''}`}>
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
                  {m.pnl >= 0 ? '+' : ''}{fmt(m.pnl)}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">오늘 수익</p>
                <p className={`font-semibold ${m.dailyPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {m.dailyPnl >= 0 ? '+' : ''}{fmt(m.dailyPnl)}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">평가금액</p>
                <p className="font-semibold">{fmt(m.totalCurrent)}</p>
              </div>
            </div>
            {m.holdings.length > 0 && (
              <p className="mt-2 text-xs text-zinc-500">
                {m.holdings.map((h: Holding) => h.symbol).join(', ')}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
