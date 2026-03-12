'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

/* ── 타이핑 애니메이션 훅 ── */
function useTypewriter(words: string[], speed = 80, pause = 1400) {
  const [display, setDisplay] = useState('')
  const [wordIdx, setWordIdx] = useState(0)
  const [charIdx, setCharIdx] = useState(0)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const word = words[wordIdx]
    const timeout = setTimeout(() => {
      if (!deleting) {
        setDisplay(word.slice(0, charIdx + 1))
        if (charIdx + 1 === word.length) {
          setTimeout(() => setDeleting(true), pause)
        } else {
          setCharIdx(c => c + 1)
        }
      } else {
        setDisplay(word.slice(0, charIdx - 1))
        if (charIdx - 1 === 0) {
          setDeleting(false)
          setWordIdx(i => (i + 1) % words.length)
          setCharIdx(0)
        } else {
          setCharIdx(c => c - 1)
        }
      }
    }, deleting ? speed / 2 : speed)
    return () => clearTimeout(timeout)
  }, [charIdx, deleting, wordIdx, words, speed, pause])

  return display
}

/* ── 숫자 카운트업 훅 ── */
function useCountUp(target: number, duration = 1500, started = false) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!started) return
    const start = Date.now()
    const tick = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.floor(eased * target))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [started, target, duration])
  return value
}

/* ── 스크롤 진입 감지 훅 ── */
function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true) }, { threshold })
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, inView }
}

/* ── 실시간 시세 시뮬레이터 ── */
const BASE_PRICES: Record<string, number> = {
  '삼성전자': 73400, 'NVDA': 124.30, 'AAPL': 213.50, 'KODEX 200': 34850,
}
function useLivePrices() {
  const [prices, setPrices] = useState(BASE_PRICES)
  useEffect(() => {
    const iv = setInterval(() => {
      setPrices(prev => {
        const next = { ...prev }
        Object.keys(next).forEach(k => {
          const delta = next[k] * (Math.random() * 0.004 - 0.002)
          next[k] = parseFloat((next[k] + delta).toFixed(k === 'NVDA' || k === 'AAPL' ? 2 : 0))
        })
        return next
      })
    }, 1200)
    return () => clearInterval(iv)
  }, [])
  return prices
}

/* ── 검색 데모 컴포넌트 ── */
function SearchDemo() {
  const query = useTypewriter(['삼성전자', 'NVDA', 'AAPL', 'KODEX 200', '카카오'], 90, 1200)
  const [showResult, setShowResult] = useState(false)

  useEffect(() => {
    setShowResult(query.length > 2)
  }, [query])

  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden w-full max-w-sm mx-auto">
      <div className="p-4 border-b border-gray-100">
        <div className="text-xs font-semibold text-gray-500 mb-2">종목 추가</div>
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200">
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-sm text-gray-700 flex-1 min-h-[1.2em]">
            {query}
            <span className="animate-pulse">|</span>
          </span>
        </div>
      </div>
      {showResult && (
        <div className="divide-y divide-gray-50">
          {[
            { name: query.length > 3 ? query : '삼성전자', ticker: '005930', price: '₩73,400', change: '+1.2%', up: true },
            { name: '삼성SDI', ticker: '006400', price: '₩320,000', change: '-0.6%', up: false },
          ].map((s, i) => (
            <div key={i} className={`flex items-center justify-between px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors ${i === 0 ? 'bg-blue-50/60' : ''}`}>
              <div>
                <div className="text-sm font-semibold text-gray-800">{s.name}</div>
                <div className="text-xs text-gray-400">{s.ticker}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-gray-700">{s.price}</div>
                <div className={`text-xs font-semibold ${s.up ? 'text-green-500' : 'text-red-400'}`}>{s.change}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── 실시간 가격 대시보드 ── */
function LiveDashboard() {
  const prices = useLivePrices()
  const [prevPrices, setPrevPrices] = useState(BASE_PRICES)
  const [flashing, setFlashing] = useState<Record<string, 'up' | 'down' | null>>({})

  useEffect(() => {
    const next: Record<string, 'up' | 'down' | null> = {}
    Object.keys(prices).forEach(k => {
      if (prices[k] > prevPrices[k]) next[k] = 'up'
      else if (prices[k] < prevPrices[k]) next[k] = 'down'
      else next[k] = null
    })
    setFlashing(next)
    setPrevPrices(prices)
    const t = setTimeout(() => setFlashing({}), 600)
    return () => clearTimeout(t)
  }, [prices])

  const holdings = [
    { name: '삼성전자', qty: 100, avgPrice: 68000 },
    { name: 'NVDA', qty: 5, avgPrice: 95.20 },
    { name: 'AAPL', qty: 10, avgPrice: 195.30 },
    { name: 'KODEX 200', qty: 30, avgPrice: 33200 },
  ]

  return (
    <div className="bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden w-full">
      {/* Window chrome */}
      <div className="bg-zinc-800 px-4 py-3 flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-red-400" />
        <div className="w-3 h-3 rounded-full bg-yellow-400" />
        <div className="w-3 h-3 rounded-full bg-green-400" />
        <div className="ml-3 text-xs text-zinc-500">Dashboard — Stocks</div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-green-400">실시간</span>
        </div>
      </div>
      <div className="p-4 space-y-3">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: '총 평가금액', value: '₩24,830,000', sub: '+12.4%', color: 'text-green-400' },
            { label: '오늘 수익', value: '+₩184,000', sub: '+0.74%', color: 'text-green-400' },
            { label: '보유 종목', value: '4종목', sub: '국내+해외', color: 'text-zinc-400' },
          ].map(c => (
            <div key={c.label} className="bg-zinc-800 rounded-xl p-3">
              <div className="text-xs text-zinc-500 mb-1">{c.label}</div>
              <div className="text-sm font-bold text-white">{c.value}</div>
              <div className={`text-xs ${c.color}`}>{c.sub}</div>
            </div>
          ))}
        </div>
        {/* Holdings */}
        <div className="bg-zinc-800 rounded-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-zinc-700 flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-300">보유 종목</span>
            <span className="text-xs text-zinc-600">실시간 시세</span>
          </div>
          {holdings.map(h => {
            const cur = prices[h.name] ?? h.avgPrice
            const total = cur * h.qty
            const profit = (cur - h.avgPrice) / h.avgPrice * 100
            const flash = flashing[h.name]
            return (
              <div
                key={h.name}
                className={`flex items-center justify-between px-3 py-2.5 border-b border-zinc-700/50 transition-colors duration-300 ${
                  flash === 'up' ? 'bg-green-900/30' : flash === 'down' ? 'bg-red-900/20' : ''
                }`}
              >
                <div>
                  <div className="text-xs font-semibold text-white">{h.name}</div>
                  <div className="text-xs text-zinc-500">{h.qty}주</div>
                </div>
                <div className="text-right">
                  <div className={`text-xs font-bold transition-colors duration-300 ${
                    flash === 'up' ? 'text-green-300' : flash === 'down' ? 'text-red-300' : 'text-white'
                  }`}>
                    {h.name.includes('전자') || h.name.includes('KO')
                      ? `₩${cur.toLocaleString()}`
                      : `$${cur.toFixed(2)}`}
                  </div>
                  <div className={`text-xs font-semibold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {profit >= 0 ? '+' : ''}{profit.toFixed(1)}%
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ── 그룹 랭킹 애니메이션 ── */
function GroupRanking() {
  const members = [
    { name: '오성', rate: 24.3, color: 'bg-blue-500' },
    { name: '지훈', rate: 18.7, color: 'bg-purple-500' },
    { name: '민지', rate: 11.2, color: 'bg-pink-500' },
    { name: '현우', rate: -3.4, color: 'bg-orange-500' },
  ]
  const { ref, inView } = useInView(0.3)
  const [animated, setAnimated] = useState(false)

  useEffect(() => { if (inView) setTimeout(() => setAnimated(true), 200) }, [inView])

  return (
    <div ref={ref} className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <div className="text-sm font-bold text-gray-800">📊 주식 스터디 — 수익률 랭킹</div>
        <div className="text-xs text-gray-400 mt-0.5">2026년 누적 수익률</div>
      </div>
      <div className="p-4 space-y-3">
        {members.map((m, i) => (
          <div key={m.name} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span>{['🥇','🥈','🥉','4️⃣'][i]}</span>
                <div className={`w-6 h-6 rounded-full ${m.color} flex items-center justify-center text-white text-xs font-bold`}>{m.name[0]}</div>
                <span className="font-medium text-gray-700">{m.name}</span>
              </div>
              <span className={`font-bold ${m.rate >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                {m.rate >= 0 ? '+' : ''}{m.rate}%
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-out ${m.rate >= 0 ? m.color : 'bg-red-400'}`}
                style={{ width: animated ? `${Math.abs(m.rate) / 30 * 100}%` : '0%' }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── 통계 카운트업 섹션 ── */
function StatsSection() {
  const { ref, inView } = useInView(0.3)
  const v1 = useCountUp(10000, 1800, inView)
  const v2 = useCountUp(500, 1400, inView)
  const v3 = useCountUp(99, 1200, inView)

  return (
    <div ref={ref} className="py-20 px-6 border-y border-gray-100">
      <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        <div>
          <div className="text-4xl font-extrabold text-gray-900 mb-1">{v1.toLocaleString()}+</div>
          <div className="text-sm text-gray-400">등록 가능 종목 수</div>
        </div>
        <div>
          <div className="text-4xl font-extrabold text-gray-900 mb-1">{v2}+</div>
          <div className="text-sm text-gray-400">활성 사용자</div>
        </div>
        <div>
          <div className="text-4xl font-extrabold text-gray-900 mb-1">{v3}%</div>
          <div className="text-sm text-gray-400">실시간 시세 정확도</div>
        </div>
        <div>
          <div className="text-4xl font-extrabold text-blue-600 mb-1">무료</div>
          <div className="text-sm text-gray-400">기본 플랜</div>
        </div>
      </div>
    </div>
  )
}

/* ── FadeIn 래퍼 ── */
function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, inView } = useInView(0.15)
  return (
    <div
      ref={ref}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(32px)',
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

const LOGOS = ['삼성','LG','현대','SK','카카오','네이버','쿠팡','배민','토스','당근','크래프톤','넥슨']

const TESTIMONIALS = [
  { name: '김성준', role: '개인 투자자', quote: '여러 증권사에 흩어져있던 주식을 한곳에서 볼 수 있어서 너무 편해요. 수익률 계산을 직접 엑셀로 하던 시절이 그립지 않네요.', initial: '김', color: 'bg-blue-100 text-blue-600' },
  { name: '박지현', role: '주식 스터디 운영자', quote: '그룹 기능 덕분에 스터디원들끼리 수익률 경쟁이 생겼어요. 서로 자극이 돼서 공부도 더 열심히 하게 됐습니다.', initial: '박', color: 'bg-purple-100 text-purple-600' },
  { name: '이민호', role: '직장인 투자자', quote: '실시간 환율 반영돼서 해외 주식 수익률이 바로 원화로 보여요. 달러 환산 계산 안 해도 되니까 진짜 편합니다.', initial: '이', color: 'bg-green-100 text-green-600' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📈</span>
            <span className="font-bold text-lg">Stocks</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-6 text-sm text-gray-600">
              <a href="#features" className="hover:text-gray-900 transition-colors">기능</a>
              <a href="#testimonials" className="hover:text-gray-900 transition-colors">후기</a>
            </div>
            <Link href="/login" className="text-sm px-4 py-1.5 rounded-full border border-gray-300 hover:border-gray-400 transition-colors">로그인</Link>
            <Link href="/signup" className="text-sm px-4 py-1.5 rounded-full bg-gray-900 text-white hover:bg-gray-700 transition-colors">무료 시작</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section
        className="pt-32 pb-24 px-6 relative overflow-hidden"
        style={{
          backgroundImage: 'radial-gradient(#d1d5db 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-white/20 to-white pointer-events-none" />
        <div className="relative max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left */}
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
                ✨ 실시간 시세 자동 반영
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight mb-6">
                내 주식을<br />
                <span className="text-blue-600">한눈에</span> 관리하세요
              </h1>
              <p className="text-gray-500 text-base sm:text-lg mb-8 leading-relaxed">
                국내외 주식을 한곳에서 추적하고,<br />
                친구들과 수익률을 비교하세요.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/signup" className="flex items-center justify-center gap-2 bg-gray-900 text-white text-sm font-semibold px-6 py-3 rounded-full hover:bg-gray-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                  지금 무료로 시작하기 →
                </Link>
                <Link href="/login" className="flex items-center justify-center text-sm text-gray-500 hover:text-gray-800 transition-colors px-4 py-3">
                  이미 계정 있음 →
                </Link>
              </div>
              <p className="text-xs text-gray-400 mt-4">신용카드 불필요 · 영구 무료</p>
            </div>
            {/* Right — live dashboard */}
            <div>
              <LiveDashboard />
            </div>
          </div>
        </div>
      </section>

      {/* ── Logo marquee ── */}
      <section className="py-8 border-y border-gray-100 overflow-hidden">
        <p className="text-center text-xs text-gray-400 mb-5">투자자들이 사용하는 Stocks</p>
        <div className="flex overflow-hidden">
          <div className="flex gap-10 items-center" style={{ animation: 'marquee 22s linear infinite' }}>
            {[...LOGOS, ...LOGOS].map((logo, i) => (
              <div key={i} className="text-sm font-semibold text-gray-300 shrink-0 px-4 py-2 rounded-lg border border-gray-100 whitespace-nowrap">
                {logo}
              </div>
            ))}
          </div>
        </div>
        <style>{`@keyframes marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }`}</style>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto space-y-32">

          {/* Feature 1: 종목 검색 */}
          <FadeIn>
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="text-xs font-semibold text-blue-500 uppercase tracking-widest mb-3">종목 추가</div>
                <h2 className="text-3xl font-extrabold mb-4">검색 한 번으로<br />바로 포트폴리오에 추가</h2>
                <p className="text-gray-500 leading-relaxed">국내외 주식명 또는 티커로 검색하면 실시간 시세와 함께 바로 추가할 수 있습니다. 복잡한 설정 없이 수량과 매입가만 입력하면 끝.</p>
              </div>
              <div className="flex items-center justify-center py-8">
                <SearchDemo />
              </div>
            </div>
          </FadeIn>

          {/* Feature 2: 실시간 대시보드 */}
          <FadeIn>
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="order-2 md:order-1">
                <GroupRanking />
              </div>
              <div className="order-1 md:order-2">
                <div className="text-xs font-semibold text-purple-500 uppercase tracking-widest mb-3">그룹 비교</div>
                <h2 className="text-3xl font-extrabold mb-4">친구들과 수익률<br />실시간 경쟁</h2>
                <p className="text-gray-500 leading-relaxed">그룹을 만들면 구성원 전원의 수익률이 실시간 랭킹으로 표시됩니다. 서로 자극을 주고받으며 더 나은 투자 습관을 만들어보세요.</p>
              </div>
            </div>
          </FadeIn>

          {/* Feature 3: 히스토리 */}
          <FadeIn>
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="text-xs font-semibold text-green-500 uppercase tracking-widest mb-3">히스토리</div>
                <h2 className="text-3xl font-extrabold mb-4">투자 여정을<br />그래프로 기록</h2>
                <p className="text-gray-500 leading-relaxed">매일 자동으로 포트폴리오 스냅샷을 저장합니다. 시간이 지날수록 나의 수익률 변화를 한눈에 볼 수 있습니다.</p>
              </div>
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                <div className="text-sm font-bold text-gray-700 mb-4">포트폴리오 수익률 추이</div>
                <div className="relative h-40">
                  <svg viewBox="0 0 400 140" className="w-full h-full" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {/* Grid lines */}
                    {[30,60,90,120].map(y => (
                      <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="#f3f4f6" strokeWidth="1" />
                    ))}
                    {/* Area */}
                    <path d="M0,120 C40,115 80,105 120,90 C160,75 200,65 240,50 C280,35 320,25 360,15 L400,10 L400,140 L0,140 Z" fill="url(#areaGrad)" />
                    {/* Line */}
                    <path d="M0,120 C40,115 80,105 120,90 C160,75 200,65 240,50 C280,35 320,25 360,15 L400,10" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    {/* Dot */}
                    <circle cx="400" cy="10" r="4" fill="#3b82f6" />
                    <circle cx="400" cy="10" r="8" fill="#3b82f6" fillOpacity="0.2" className="animate-ping" />
                  </svg>
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-2">
                  {['1월','2월','3월','4월','5월','6월'].map(m => <span key={m}>{m}</span>)}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-2xl font-extrabold text-gray-900">+24.3%</span>
                  <span className="text-sm text-green-500 font-semibold">↑ 6개월 누적</span>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Stats ── */}
      <StatsSection />

      {/* ── Testimonials ── */}
      <section id="testimonials" className="py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">투자자들이 직접 경험한 변화</h2>
              <p className="text-gray-500">복잡했던 포트폴리오 관리가 이렇게 달라졌습니다.</p>
            </div>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <FadeIn key={t.name} delay={i * 120}>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-full ${t.color} flex items-center justify-center font-bold text-sm`}>
                      {t.initial}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-800">{t.name}</div>
                      <div className="text-xs text-gray-400">{t.role}</div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">"{t.quote}"</p>
                  <div className="mt-4 flex gap-0.5">
                    {[...Array(5)].map((_, i) => <span key={i} className="text-yellow-400 text-sm">★</span>)}
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-32 px-6 text-center relative overflow-hidden"
        style={{ backgroundImage: 'radial-gradient(#d1d5db 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-white via-white/10 to-white pointer-events-none" />
        <FadeIn>
          <div className="relative max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
              지금 바로 포트폴리오를<br />시작해보세요
            </h2>
            <p className="text-gray-500 mb-10">가입 후 5분이면 모든 보유 종목을 등록할 수 있습니다.</p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-gray-900 text-white text-base font-semibold px-8 py-4 rounded-full hover:bg-gray-700 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1"
            >
              무료로 시작하기 →
            </Link>
            <p className="text-xs text-gray-400 mt-4">카드 등록 불필요 · 언제든 탈퇴 가능</p>
          </div>
        </FadeIn>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-zinc-900 text-zinc-400 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">📈</span>
                <span className="font-bold text-white text-lg">Stocks</span>
              </div>
              <p className="text-sm text-zinc-500 max-w-xs">포트폴리오 관리와 그룹 수익 비교를 위한 가장 간단한 방법</p>
            </div>
            <div className="flex gap-12 text-sm">
              <div className="space-y-2">
                <div className="text-zinc-300 font-semibold mb-3">서비스</div>
                <div><Link href="/signup" className="hover:text-white transition-colors">회원가입</Link></div>
                <div><Link href="/login" className="hover:text-white transition-colors">로그인</Link></div>
                <div><Link href="/dashboard" className="hover:text-white transition-colors">대시보드</Link></div>
              </div>
              <div className="space-y-2">
                <div className="text-zinc-300 font-semibold mb-3">정보</div>
                <div><a href="#features" className="hover:text-white transition-colors">기능 소개</a></div>
                <div><a href="#testimonials" className="hover:text-white transition-colors">사용자 후기</a></div>
              </div>
            </div>
          </div>
          <div className="border-t border-zinc-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-zinc-600">
            <span>©2026 Stocks. Built with ❤️</span>
            <div className="flex gap-4">
              <a href="#" className="hover:text-zinc-400 transition-colors">이용약관</a>
              <a href="#" className="hover:text-zinc-400 transition-colors">개인정보 처리방침</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
