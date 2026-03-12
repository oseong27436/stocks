'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

/* ════════════════════════════════════════
   스크롤 진입 감지
════════════════════════════════════════ */
function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true) }, { threshold })
    obs.observe(el); return () => obs.disconnect()
  }, [threshold])
  return { ref, inView }
}

/* ════════════════════════════════════════
   숫자 카운트업
════════════════════════════════════════ */
function useCountUp(target: number, duration = 1500, started = false) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!started) return
    const start = Date.now()
    const tick = () => {
      const p = Math.min((Date.now() - start) / duration, 1)
      setValue(Math.floor((1 - Math.pow(1 - p, 3)) * target))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [started, target, duration])
  return value
}

/* ════════════════════════════════════════
   FadeIn 래퍼
════════════════════════════════════════ */
function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, inView } = useInView(0.15)
  return (
    <div ref={ref} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? 'translateY(0)' : 'translateY(28px)',
      transition: `opacity .6s ease ${delay}ms, transform .6s ease ${delay}ms`,
    }}>
      {children}
    </div>
  )
}

/* ════════════════════════════════════════
   실시간 가격 시뮬레이터
════════════════════════════════════════ */
const BASE: Record<string, number> = { '삼성전자': 73400, 'NVDA': 124.30, 'AAPL': 213.50, 'KODEX 200': 34850 }
function useLivePrices() {
  const [prices, setPrices] = useState(BASE)
  useEffect(() => {
    const iv = setInterval(() => setPrices(p => {
      const n = { ...p }
      Object.keys(n).forEach(k => {
        n[k] = parseFloat((n[k] * (1 + (Math.random() * .004 - .002))).toFixed(k.match(/NVDA|AAPL/) ? 2 : 0))
      })
      return n
    }), 1200)
    return () => clearInterval(iv)
  }, [])
  return prices
}

/* ════════════════════════════════════════
   ★ 메인 인터랙티브 데모 ★
   시나리오:
   0  빈 포트폴리오 보여줌
   1  검색창 포커스
   2  "NVDA" 한 글자씩 타이핑
   3  드롭다운 등장
   4  첫 번째 결과 하이라이트 (클릭 효과)
   5  수량/가격 입력폼 등장 + 자동 입력
   6  추가 버튼 클릭 효과
   7  카드가 포트폴리오에 슬라이드인
   8  총 수익률 업데이트 (카운트업)
   9  잠시 보여준 뒤 리셋 → 루프
════════════════════════════════════════ */
const SEARCH_WORD = 'NVDA'
const RESULTS = [
  { name: 'NVIDIA Corp', ticker: 'NVDA', price: '$124.30', change: '+2.4%', up: true },
  { name: 'NV5 Global', ticker: 'NVEI', price: '$31.40', change: '-0.8%', up: false },
]
const HOLDINGS_INIT = [
  { name: '삼성전자', ticker: '005930', qty: 100, rate: '+8.3', up: true },
  { name: 'AAPL',     ticker: 'NASDAQ', qty: 10,  rate: '+9.2', up: true },
  { name: 'KODEX 200',ticker: '069500', qty: 30,  rate: '+5.7', up: true },
]

type Step = 0|1|2|3|4|5|6|7|8|9

function InteractiveDemo() {
  const [step, setStep] = useState<Step>(0)
  const [typed, setTyped] = useState('')
  const [qty, setQty]     = useState('')
  const [price, setPrice] = useState('')
  const [btnClick, setBtnClick] = useState(false)
  const [holdings, setHoldings] = useState(HOLDINGS_INIT)
  const [totalRate, setTotalRate] = useState(7.4)
  const prices = useLivePrices()

  // 전체 시퀀스
  useEffect(() => {
    let ts: ReturnType<typeof setTimeout>[] = []
    const t = (fn: () => void, ms: number) => { const id = setTimeout(fn, ms); ts.push(id); return id }

    const run = () => {
      // 리셋
      setStep(0); setTyped(''); setQty(''); setPrice(''); setBtnClick(false)
      setHoldings(HOLDINGS_INIT); setTotalRate(7.4)

      // Step 1: 포커스
      t(() => setStep(1), 1200)

      // Step 2: 타이핑 N-V-D-A
      let charDelay = 1800
      for (let i = 1; i <= SEARCH_WORD.length; i++) {
        const word = SEARCH_WORD.slice(0, i)
        t(() => { setTyped(word); setStep(2) }, charDelay)
        charDelay += 110
      }

      // Step 3: 드롭다운
      t(() => setStep(3), charDelay + 200)

      // Step 4: 결과 하이라이트
      t(() => setStep(4), charDelay + 900)

      // Step 5: 폼 등장 + qty 입력
      t(() => setStep(5), charDelay + 1500)
      t(() => setQty('5'),    charDelay + 2100)
      t(() => setPrice('$95.'), charDelay + 2500)
      t(() => setPrice('$95.20'), charDelay + 2900)

      // Step 6: 버튼 클릭
      t(() => { setStep(6); setBtnClick(true) }, charDelay + 3600)
      t(() => setBtnClick(false), charDelay + 3900)

      // Step 7: 카드 추가
      t(() => {
        setStep(7)
        setHoldings(h => [...h, { name: 'NVDA', ticker: 'NASDAQ', qty: 5, rate: '+24.2', up: true }])
      }, charDelay + 4100)

      // Step 8: 수익률 업데이트
      t(() => { setStep(8); setTotalRate(9.1) }, charDelay + 4700)

      // Step 9: 완성 보여주다가 리셋
      t(() => setStep(9), charDelay + 5500)
      t(() => run(), charDelay + 8000)
    }

    run()
    return () => ts.forEach(clearTimeout)
  }, [])

  const isFocused = step >= 1
  const showDrop   = step >= 3
  const showForm   = step >= 5
  const newCard    = step >= 7

  return (
    <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden select-none">
      {/* 윈도우 크롬 */}
      <div className="bg-gray-100 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-red-400" />
        <div className="w-3 h-3 rounded-full bg-yellow-400" />
        <div className="w-3 h-3 rounded-full bg-green-400" />
        <div className="ml-3 bg-white border border-gray-200 rounded px-3 py-0.5 text-xs text-gray-400 w-52">
          stocks-pearl-one.vercel.app
        </div>
      </div>

      <div className="flex min-h-[420px]">
        {/* 사이드바 */}
        <div className="w-36 shrink-0 bg-zinc-900 p-3 space-y-1">
          {[['📊','대시보드',true],['💼','포트폴리오',false],['👥','그룹',false],['📈','히스토리',false]].map(([ic,lb,active]) => (
            <div key={String(lb)} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs ${active ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`}>
              <span>{ic}</span><span>{lb}</span>
            </div>
          ))}
          {/* 환율 위젯 */}
          <div className="mt-4 bg-zinc-800 rounded-xl p-2.5">
            <div className="text-xs text-zinc-500 mb-0.5">USD/KRW</div>
            <div className="text-sm font-bold text-white">1,327</div>
            <div className="text-xs text-green-400">+2.1</div>
          </div>
        </div>

        {/* 메인 영역 */}
        <div className="flex-1 p-4 bg-zinc-950 space-y-3 overflow-hidden">

          {/* 총 수익 카드 */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: '총 평가금액', value: '₩24,830,000' },
              { label: '총 수익률', value: `+${totalRate.toFixed(1)}%`, highlight: true },
              { label: '보유 종목', value: `${holdings.length}종목` },
            ].map(c => (
              <div key={c.label} className={`rounded-xl p-3 transition-colors duration-500 ${c.highlight && step >= 8 ? 'bg-green-900/40' : 'bg-zinc-800'}`}>
                <div className="text-xs text-zinc-500 mb-0.5">{c.label}</div>
                <div className={`text-sm font-bold transition-colors duration-500 ${c.highlight && step >= 8 ? 'text-green-300' : 'text-white'}`}>
                  {c.value}
                </div>
              </div>
            ))}
          </div>

          {/* 보유 종목 리스트 */}
          <div className="bg-zinc-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-700">
              <span className="text-xs font-semibold text-zinc-300">보유 종목</span>
              {/* 종목 추가 버튼 */}
              <button
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all duration-200 ${
                  isFocused ? 'bg-blue-600 text-white scale-95' : 'bg-zinc-700 text-zinc-400'
                }`}
              >
                + 추가
              </button>
            </div>

            {/* 기존 종목 */}
            {holdings.map((h, i) => {
              const isNew = h.name === 'NVDA' && i === holdings.length - 1 && newCard
              const cur = prices[h.name]
              return (
                <div
                  key={`${h.name}-${i}`}
                  className="flex items-center justify-between px-3 py-2 border-b border-zinc-700/40"
                  style={{
                    opacity: isNew ? 1 : 1,
                    transform: isNew ? 'translateY(0)' : undefined,
                    animation: isNew ? 'slideIn .4s ease' : undefined,
                    background: isNew ? 'rgba(34,197,94,.08)' : undefined,
                  }}
                >
                  <div>
                    <div className="text-xs font-semibold text-white">{h.name}</div>
                    <div className="text-xs text-zinc-500">{h.ticker} · {h.qty}주</div>
                  </div>
                  <div className="text-right">
                    {cur && (
                      <div className="text-xs text-zinc-400">{h.name.match(/전자|KO/) ? `₩${cur.toLocaleString()}` : `$${cur}`}</div>
                    )}
                    <div className={`text-xs font-bold ${h.up ? 'text-green-400' : 'text-red-400'}`}>
                      {h.up ? '+' : ''}{h.rate}%
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── 오버레이: 종목 추가 모달 ── */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center transition-all duration-300"
        style={{ opacity: isFocused ? 1 : 0, pointerEvents: isFocused ? 'auto' : 'none' }}
      >
        <div className="bg-white rounded-2xl shadow-2xl w-72 overflow-hidden">
          {/* 모달 헤더 */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-bold text-gray-800">종목 추가</span>
            <span className="text-gray-400 text-lg cursor-pointer leading-none">×</span>
          </div>

          <div className="p-4 space-y-3">
            {/* 검색창 */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">종목 검색</label>
              <div className={`flex items-center gap-2 rounded-xl px-3 py-2 border transition-all duration-200 ${isFocused ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200 bg-gray-50'}`}>
                <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="text-sm text-gray-700 flex-1 min-h-[1.2em] font-mono">
                  {typed}{isFocused && step <= 2 && <span className="animate-pulse border-r-2 border-gray-700 ml-px" />}
                </span>
              </div>

              {/* 드롭다운 */}
              <div
                className="mt-1 border border-gray-100 rounded-xl shadow-lg overflow-hidden transition-all duration-300"
                style={{ maxHeight: showDrop ? '120px' : '0px', opacity: showDrop ? 1 : 0 }}
              >
                {RESULTS.map((r, i) => (
                  <div
                    key={r.ticker}
                    className={`flex items-center justify-between px-3 py-2.5 cursor-pointer transition-colors duration-200 ${
                      i === 0 && step >= 4 ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-gray-800">{r.ticker}</div>
                      <div className="text-xs text-gray-400">{r.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold text-gray-700">{r.price}</div>
                      <div className={`text-xs font-bold ${r.up ? 'text-green-500' : 'text-red-400'}`}>{r.change}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 수량 / 가격 입력 */}
            <div
              className="space-y-2 transition-all duration-400"
              style={{ maxHeight: showForm ? '200px' : '0px', opacity: showForm ? 1 : 0, overflow: 'hidden' }}
            >
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">수량</label>
                  <div className={`border rounded-xl px-3 py-2 text-sm font-mono text-gray-800 transition-all ${qty ? 'border-blue-400 bg-blue-50/40' : 'border-gray-200 bg-gray-50'}`}>
                    {qty || <span className="text-gray-300">0</span>}
                    {showForm && !qty && <span className="animate-pulse border-r border-gray-400 ml-px" />}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">매입가</label>
                  <div className={`border rounded-xl px-3 py-2 text-sm font-mono text-gray-800 transition-all ${price ? 'border-blue-400 bg-blue-50/40' : 'border-gray-200 bg-gray-50'}`}>
                    {price || <span className="text-gray-300">$0</span>}
                    {qty && !price && <span className="animate-pulse border-r border-gray-400 ml-px" />}
                  </div>
                </div>
              </div>

              {/* 현재가 참고 */}
              {price && (
                <div className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-1.5 flex justify-between">
                  <span>현재가</span>
                  <span className="font-semibold text-green-600">$124.30 <span className="text-green-500">+24.2%</span></span>
                </div>
              )}

              {/* 추가 버튼 */}
              <button
                className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all duration-150 ${
                  price
                    ? btnClick
                      ? 'bg-green-600 text-white scale-95'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {step >= 7 ? '✓ 추가됨' : '포트폴리오에 추가'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 완성 상태 배지 */}
      {step === 9 && (
        <div className="absolute top-4 right-4 bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg animate-bounce">
          ✓ NVDA 추가 완료!
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

/* ════════════════════════════════════════
   그룹 랭킹 애니메이션
════════════════════════════════════════ */
function GroupRanking() {
  const members = [
    { name: '민준', rate: 24.3, color: 'bg-blue-500' },
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
                style={{ width: animated ? `${Math.abs(m.rate) / 30 * 100}%` : '0%', transitionDelay: `${i * 100}ms` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ════════════════════════════════════════
   통계 카운트업
════════════════════════════════════════ */
function StatsSection() {
  const { ref, inView } = useInView(0.3)
  const v1 = useCountUp(10000, 1800, inView)
  const v2 = useCountUp(500, 1400, inView)
  const v3 = useCountUp(99, 1200, inView)
  return (
    <div ref={ref} className="py-20 px-6 border-y border-gray-100">
      <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        {[
          { value: `${v1.toLocaleString()}+`, label: '등록 가능 종목 수' },
          { value: `${v2}+`, label: '활성 사용자' },
          { value: `${v3}%`, label: '실시간 시세 정확도' },
          { value: '무료', label: '기본 플랜', blue: true },
        ].map(s => (
          <div key={s.label}>
            <div className={`text-4xl font-extrabold mb-1 ${s.blue ? 'text-blue-600' : 'text-gray-900'}`}>{s.value}</div>
            <div className="text-sm text-gray-400">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ════════════════════════════════════════
   상수
════════════════════════════════════════ */
const LOGOS = ['삼성','LG','현대','SK','카카오','네이버','쿠팡','배민','토스','당근','크래프톤','넥슨']
const TESTIMONIALS = [
  { name: '김성준', role: '개인 투자자', quote: '여러 증권사에 흩어져있던 주식을 한곳에서 볼 수 있어서 너무 편해요. 엑셀로 수익률 계산하던 시절이 그립지 않네요.', initial: '김', color: 'bg-blue-100 text-blue-600' },
  { name: '박지현', role: '주식 스터디 운영자', quote: '그룹 기능 덕분에 스터디원들끼리 수익률 경쟁이 생겼어요. 서로 자극이 돼서 공부도 더 열심히 하게 됐습니다.', initial: '박', color: 'bg-purple-100 text-purple-600' },
  { name: '이민호', role: '직장인 투자자', quote: '실시간 환율 반영돼서 해외 주식 수익률이 원화로 바로 보여요. 달러 환산 계산 안 해도 되니까 정말 편합니다.', initial: '이', color: 'bg-green-100 text-green-600' },
]

/* ════════════════════════════════════════
   PAGE
════════════════════════════════════════ */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900" style={{ fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif" }}>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📈</span>
            <span className="font-bold text-lg">Stocks</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex gap-6 text-sm text-gray-600">
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
        className="pt-28 pb-20 px-6 relative overflow-hidden"
        style={{ backgroundImage: 'radial-gradient(#d1d5db 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-transparent to-white pointer-events-none" />
        <div className="relative max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              ✨ 실시간 시세 자동 반영
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight mb-6">
              내 주식을<br /><span className="text-blue-600">한눈에</span> 관리하세요
            </h1>
            <p className="text-gray-500 text-base sm:text-lg mb-8 leading-relaxed">
              국내외 주식을 한곳에서 추적하고,<br />친구들과 수익률을 비교하세요.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/signup" className="flex items-center justify-center gap-2 bg-gray-900 text-white text-sm font-semibold px-6 py-3 rounded-full hover:bg-gray-700 transition-all shadow-lg hover:-translate-y-0.5">
                지금 무료로 시작하기 →
              </Link>
              <Link href="/login" className="flex items-center justify-center text-sm text-gray-500 hover:text-gray-800 px-4 py-3 transition-colors">
                이미 계정 있음 →
              </Link>
            </div>
            <p className="text-xs text-gray-400 mt-4">신용카드 불필요 · 영구 무료</p>
          </div>
          {/* ★ 인터랙티브 데모 */}
          <InteractiveDemo />
        </div>
      </section>

      {/* Logo marquee */}
      <section className="py-8 border-y border-gray-100 overflow-hidden">
        <p className="text-center text-xs text-gray-400 mb-5">투자자들이 사용하는 Stocks</p>
        <div className="flex overflow-hidden">
          <div className="flex gap-10 items-center shrink-0" style={{ animation: 'marquee 22s linear infinite' }}>
            {[...LOGOS, ...LOGOS].map((l, i) => (
              <div key={i} className="text-sm font-semibold text-gray-300 shrink-0 px-4 py-2 rounded-lg border border-gray-100">{l}</div>
            ))}
          </div>
        </div>
        <style>{`@keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto space-y-28">

          <FadeIn>
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="text-xs font-semibold text-blue-500 uppercase tracking-widest mb-3">종목 추가</div>
                <h2 className="text-3xl font-extrabold mb-4">검색 한 번으로<br />바로 포트폴리오에 추가</h2>
                <p className="text-gray-500 leading-relaxed">국내외 주식명 또는 티커로 검색하면 실시간 시세와 함께 바로 추가할 수 있습니다. 수량과 매입가만 입력하면 수익률이 자동으로 계산됩니다.</p>
              </div>
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 space-y-3">
                {['삼성전자', 'NVDA', 'AAPL'].map((s, i) => (
                  <div key={s} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                    <div>
                      <div className="text-sm font-bold text-gray-800">{s}</div>
                      <div className="text-xs text-gray-400">{['005930','NASDAQ','NASDAQ'][i]}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-700">{['₩73,400','$124.30','$213.50'][i]}</div>
                      <div className="text-xs font-bold text-green-500">{['+1.2%','+2.4%','+0.8%'][i]}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          <FadeIn>
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="order-2 md:order-1"><GroupRanking /></div>
              <div className="order-1 md:order-2">
                <div className="text-xs font-semibold text-purple-500 uppercase tracking-widest mb-3">그룹 비교</div>
                <h2 className="text-3xl font-extrabold mb-4">친구들과 수익률<br />실시간 경쟁</h2>
                <p className="text-gray-500 leading-relaxed">그룹을 만들면 구성원 전원의 수익률이 실시간 랭킹으로 표시됩니다. 서로 자극을 주고받으며 더 나은 투자 습관을 만들어보세요.</p>
              </div>
            </div>
          </FadeIn>

          <FadeIn>
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="text-xs font-semibold text-green-500 uppercase tracking-widest mb-3">히스토리</div>
                <h2 className="text-3xl font-extrabold mb-4">투자 여정을<br />그래프로 기록</h2>
                <p className="text-gray-500 leading-relaxed">매일 자동으로 포트폴리오 스냅샷을 저장합니다. 시간이 지날수록 나의 수익률 변화를 한눈에 볼 수 있습니다.</p>
              </div>
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                <div className="text-sm font-bold text-gray-700 mb-4">포트폴리오 수익률 추이</div>
                <div className="relative h-36">
                  <svg viewBox="0 0 400 130" className="w-full h-full" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity=".25" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {[30,65,100].map(y => <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="#f3f4f6" strokeWidth="1" />)}
                    <path d="M0,115 C50,110 100,95 150,80 C200,65 250,45 300,28 L400,8 L400,130 L0,130 Z" fill="url(#ag)" />
                    <path d="M0,115 C50,110 100,95 150,80 C200,65 250,45 300,28 L400,8" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
                    <circle cx="400" cy="8" r="4" fill="#3b82f6" />
                  </svg>
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
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

      <StatsSection />

      {/* Testimonials */}
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
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-full ${t.color} flex items-center justify-center font-bold text-sm`}>{t.initial}</div>
                    <div>
                      <div className="text-sm font-semibold text-gray-800">{t.name}</div>
                      <div className="text-xs text-gray-400">{t.role}</div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">"{t.quote}"</p>
                  <div className="mt-4 flex gap-0.5">{[...Array(5)].map((_,i)=><span key={i} className="text-yellow-400 text-sm">★</span>)}</div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6 text-center relative overflow-hidden"
        style={{ backgroundImage: 'radial-gradient(#d1d5db 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-white via-white/10 to-white pointer-events-none" />
        <FadeIn>
          <div className="relative max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">지금 바로 포트폴리오를<br />시작해보세요</h2>
            <p className="text-gray-500 mb-10">가입 후 5분이면 모든 보유 종목을 등록할 수 있습니다.</p>
            <Link href="/signup" className="inline-flex items-center gap-2 bg-gray-900 text-white text-base font-semibold px-8 py-4 rounded-full hover:bg-gray-700 transition-all shadow-xl hover:-translate-y-1">
              무료로 시작하기 →
            </Link>
            <p className="text-xs text-gray-400 mt-4">카드 등록 불필요 · 언제든 탈퇴 가능</p>
          </div>
        </FadeIn>
      </section>

      {/* Footer */}
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
