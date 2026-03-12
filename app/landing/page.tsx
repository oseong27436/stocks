'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const FEATURES = [
  {
    tab: '포트폴리오 관리',
    heading: '내 모든 주식을 한 화면에서',
    desc: '국내외 주식, ETF를 한곳에서 추적하세요. 실시간 시세와 수익률이 자동으로 계산되고, 종목별 비중을 시각적으로 확인할 수 있습니다.',
    mockup: (
      <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
          <div className="ml-4 bg-gray-200 rounded px-3 py-1 text-xs text-gray-500 w-48">stocks-pearl-one.vercel.app</div>
        </div>
        <div className="p-4 flex gap-3">
          <div className="w-36 shrink-0 space-y-1">
            {['대시보드','포트폴리오','그룹','히스토리'].map((m, i) => (
              <div key={m} className={`text-xs px-3 py-2 rounded-lg ${i === 0 ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-500'}`}>{m}</div>
            ))}
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex gap-2">
              {['+12.4%','₩24.8M','8종목'].map(v => (
                <div key={v} className="flex-1 bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">총 수익률</div>
                  <div className="text-sm font-bold text-gray-800">{v}</div>
                </div>
              ))}
            </div>
            {['삼성전자','AAPL','NVDA','KODEX 200'].map((s, i) => (
              <div key={s} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                <div className="text-xs font-medium text-gray-700">{s}</div>
                <div className={`text-xs font-semibold ${i % 2 === 0 ? 'text-green-500' : 'text-red-400'}`}>{i % 2 === 0 ? '+' : '-'}{(Math.random()*10+1).toFixed(1)}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    tab: '그룹 수익 비교',
    heading: '친구들과 수익률 경쟁하세요',
    desc: '그룹을 만들어 구성원들의 수익률을 실시간으로 비교해보세요. 랭킹 시스템으로 동기부여를 높이고, 서로의 투자 전략을 공유할 수 있습니다.',
    mockup: (
      <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="p-4 space-y-3">
          <div className="text-sm font-bold text-gray-700">📊 주식 스터디 그룹 — 수익률 랭킹</div>
          {[
            { name: '오성', rate: '+24.3%', color: 'text-green-500', rank: '🥇' },
            { name: '지훈', rate: '+18.7%', color: 'text-green-500', rank: '🥈' },
            { name: '민지', rate: '+11.2%', color: 'text-green-500', rank: '🥉' },
            { name: '현우', rate: '-3.4%',  color: 'text-red-400',   rank: '4️⃣' },
          ].map(m => (
            <div key={m.name} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-base">{m.rank}</span>
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">{m.name[0]}</div>
                <span className="text-xs font-medium text-gray-700">{m.name}</span>
              </div>
              <span className={`text-sm font-bold ${m.color}`}>{m.rate}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    tab: '수익률 히스토리',
    heading: '내 포트폴리오 성장을 추적하세요',
    desc: '일별 포트폴리오 스냅샷을 자동으로 저장합니다. 시간이 지날수록 쌓이는 수익률 그래프로 나의 투자 여정을 한눈에 볼 수 있습니다.',
    mockup: (
      <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="p-4">
          <div className="text-sm font-bold text-gray-700 mb-3">포트폴리오 수익률 추이</div>
          <div className="relative h-32">
            <svg viewBox="0 0 300 120" className="w-full h-full">
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,100 C30,95 60,80 90,70 C120,60 150,55 180,40 C210,25 240,20 300,10 L300,120 L0,120 Z" fill="url(#grad)" />
              <path d="M0,100 C30,95 60,80 90,70 C120,60 150,55 180,40 C210,25 240,20 300,10" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>1월</span><span>2월</span><span>3월</span><span>4월</span><span>5월</span><span>6월</span>
          </div>
        </div>
      </div>
    ),
  },
]

const TESTIMONIALS = [
  { name: '김성준', role: '개인 투자자', quote: '여러 증권사에 흩어져있던 주식을 한곳에서 볼 수 있어서 너무 편해요. 수익률 계산을 직접 엑셀로 하던 시절이 그립지 않네요.', initial: '김' },
  { name: '박지현', role: '주식 스터디 운영자', quote: '그룹 기능 덕분에 스터디원들끼리 수익률 경쟁이 생겼어요. 서로 자극이 돼서 공부도 더 열심히 하게 됐습니다.', initial: '박' },
  { name: '이민호', role: '직장인 투자자', quote: '실시간 환율 반영돼서 해외 주식 수익률이 바로 원화로 보여요. 달러 환산 계산 안 해도 되니까 진짜 편합니다.', initial: '이' },
]

const LOGOS = ['삼성', 'LG', '현대', 'SK', '카카오', '네이버', '쿠팡', '배민', '토스', '당근', '크래프톤', '넥슨']

export default function LandingPage() {
  const [activeFeature, setActiveFeature] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          setActiveFeature(a => (a + 1) % FEATURES.length)
          return 0
        }
        return p + 2
      })
    }, 80)
    return () => clearInterval(interval)
  }, [])

  function handleTabClick(i: number) {
    setActiveFeature(i)
    setProgress(0)
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📈</span>
            <span className="font-bold text-lg">Stocks</span>
            <span className="text-xs text-gray-400 hidden sm:block">포트폴리오 & 그룹 수익 비교</span>
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

      {/* Hero */}
      <section
        className="pt-32 pb-16 px-6 text-center relative overflow-hidden"
        style={{
          backgroundImage: 'radial-gradient(#d1d5db 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/0 to-white pointer-events-none" />
        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            ✨ 실시간 시세 자동 반영
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight mb-6 text-gray-900">
            내 주식 포트폴리오를<br />
            <span className="text-blue-600">한눈에</span> 관리하세요
          </h1>
          <p className="text-gray-500 text-base sm:text-lg mb-10 max-w-xl mx-auto leading-relaxed">
            국내외 주식을 한곳에서 추적하고, 친구들과 수익률을 비교하세요.<br />
            복잡한 계산 없이 실시간으로 포트폴리오 현황을 파악할 수 있습니다.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
            <Link
              href="/signup"
              className="flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold px-6 py-3 rounded-full hover:bg-gray-700 transition-colors shadow-lg"
            >
              지금 무료로 시작하기 →
            </Link>
            <Link
              href="/login"
              className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              이미 계정이 있으신가요? 로그인
            </Link>
          </div>
          <p className="text-xs text-gray-400">신용카드 불필요 · 영구 무료</p>
        </div>

        {/* App mockup */}
        <div className="relative max-w-4xl mx-auto mt-14">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-100 border-b border-gray-200 px-5 py-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <div className="ml-4 bg-white rounded px-3 py-1 text-xs text-gray-400 w-56 border border-gray-200">stocks-pearl-one.vercel.app/dashboard</div>
            </div>
            <div className="p-6 bg-zinc-900 flex gap-4 min-h-64">
              {/* Sidebar */}
              <div className="w-40 shrink-0 space-y-1">
                {['📊 대시보드','💼 포트폴리오','👥 그룹','📈 히스토리','⚙️ 설정'].map((m, i) => (
                  <div key={m} className={`text-xs px-3 py-2 rounded-lg ${i === 0 ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}>{m}</div>
                ))}
                <div className="mt-4 p-3 rounded-lg bg-zinc-800">
                  <div className="text-xs text-zinc-500 mb-1">USD/KRW</div>
                  <div className="text-sm font-bold text-white">1,327.40</div>
                  <div className="text-xs text-green-400">+2.10 (+0.16%)</div>
                </div>
              </div>
              {/* Main content */}
              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: '총 평가금액', value: '₩24,830,000', sub: '+12.4%', up: true },
                    { label: '총 투자금액', value: '₩22,090,000', sub: '원금', up: null },
                    { label: '총 수익', value: '+₩2,740,000', sub: '실현+미실현', up: true },
                  ].map(c => (
                    <div key={c.label} className="bg-zinc-800 rounded-xl p-3">
                      <div className="text-xs text-zinc-500 mb-1">{c.label}</div>
                      <div className="text-sm font-bold text-white">{c.value}</div>
                      <div className={`text-xs ${c.up === true ? 'text-green-400' : c.up === false ? 'text-red-400' : 'text-zinc-500'}`}>{c.sub}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-zinc-800 rounded-xl overflow-hidden">
                  <div className="px-4 py-2 border-b border-zinc-700 flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">보유 종목</span>
                    <span className="text-xs text-zinc-500">8 종목</span>
                  </div>
                  <div className="divide-y divide-zinc-700/50">
                    {[
                      { name: '삼성전자', ticker: '005930', qty: 100, rate: '+8.3%', up: true },
                      { name: 'NVDA', ticker: 'NASDAQ', qty: 5, rate: '+41.2%', up: true },
                      { name: 'AAPL', ticker: 'NASDAQ', qty: 10, rate: '-2.1%', up: false },
                      { name: 'KODEX 200', ticker: '069500', qty: 30, rate: '+5.7%', up: true },
                    ].map(s => (
                      <div key={s.name} className="flex items-center justify-between px-4 py-2">
                        <div>
                          <div className="text-xs font-medium text-white">{s.name}</div>
                          <div className="text-xs text-zinc-500">{s.ticker} · {s.qty}주</div>
                        </div>
                        <div className={`text-sm font-bold ${s.up ? 'text-green-400' : 'text-red-400'}`}>{s.rate}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Fade bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent pointer-events-none" />
        </div>
      </section>

      {/* Logo marquee */}
      <section className="py-8 border-y border-gray-100 overflow-hidden">
        <p className="text-center text-xs text-gray-400 mb-4">투자자들이 사용하는 Stocks</p>
        <div className="relative flex overflow-hidden">
          <div
            className="flex gap-12 items-center whitespace-nowrap animate-marquee"
            style={{ animation: 'marquee 20s linear infinite' }}
          >
            {[...LOGOS, ...LOGOS].map((logo, i) => (
              <div key={i} className="text-sm font-semibold text-gray-300 shrink-0 px-4 py-2 rounded-lg border border-gray-100">
                {logo}
              </div>
            ))}
          </div>
        </div>
        <style>{`
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}</style>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
              투자 관리에 필요한 모든 것
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto">
              복잡했던 포트폴리오 관리를 간단하게. 실시간 시세부터 그룹 수익 비교까지 한 플랫폼에서.
            </p>
          </div>

          {/* Tab buttons */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {FEATURES.map((f, i) => (
              <button
                key={f.tab}
                onClick={() => handleTabClick(i)}
                className={`relative px-5 py-2.5 rounded-full text-sm font-semibold transition-all overflow-hidden ${
                  activeFeature === i
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {activeFeature === i && (
                  <span
                    className="absolute bottom-0 left-0 h-0.5 bg-blue-400 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                )}
                {f.tab}
              </button>
            ))}
          </div>

          {/* Feature content */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-extrabold mb-4">{FEATURES[activeFeature].heading}</h3>
              <p className="text-gray-500 leading-relaxed">{FEATURES[activeFeature].desc}</p>
              <Link href="/signup" className="inline-flex items-center gap-2 mt-8 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                지금 시작하기 →
              </Link>
            </div>
            <div className="transition-all duration-300">
              {FEATURES[activeFeature].mockup}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
              투자자들이 직접 경험한 변화
            </h2>
            <p className="text-gray-500">복잡했던 포트폴리오 관리가 이렇게 달라졌습니다.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                    {t.initial}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-800">{t.name}</div>
                    <div className="text-xs text-gray-400">{t.role}</div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">"{t.quote}"</p>
                <div className="mt-4 flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-yellow-400 text-sm">★</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 px-6 border-y border-gray-100">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { num: '10,000+', label: '등록 종목 수' },
            { num: '500+', label: '활성 사용자' },
            { num: '실시간', label: '시세 반영' },
            { num: '무료', label: '기본 플랜' },
          ].map(s => (
            <div key={s.label}>
              <div className="text-3xl font-extrabold text-gray-900 mb-1">{s.num}</div>
              <div className="text-sm text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6 text-center relative overflow-hidden"
        style={{
          backgroundImage: 'radial-gradient(#d1d5db 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-white via-white/0 to-white pointer-events-none" />
        <div className="relative max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
            지금 바로 포트폴리오를<br />시작해보세요
          </h2>
          <p className="text-gray-500 mb-10">가입 후 5분이면 모든 보유 종목을 등록할 수 있습니다.</p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-gray-900 text-white text-base font-semibold px-8 py-4 rounded-full hover:bg-gray-700 transition-colors shadow-xl"
          >
            무료로 시작하기 →
          </Link>
          <p className="text-xs text-gray-400 mt-4">카드 등록 불필요 · 언제든 탈퇴 가능</p>
        </div>
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
