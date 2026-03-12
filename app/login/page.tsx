'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn, signInWithGoogle } from '@/lib/auth'

function isInAppBrowser() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /KAKAOTALK|Instagram|FBAN|FBAV|Line\/|naver|NaverSearch|DaumApps|Daum\/|everytimeApp|Twitter/i.test(ua)
    || (ua.includes('wv') && ua.includes('Android'))
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [inApp, setInApp] = useState(false)

  useEffect(() => {
    setInApp(isInAppBrowser())
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      router.replace('/dashboard')
    } catch (e: any) {
      setError(e.message || '로그인 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-center text-2xl font-bold">📈 Stocks</h1>
        <p className="mb-8 text-center text-zinc-400 text-sm">포트폴리오 & 그룹 수익 비교</p>

        {inApp && (
          <div className="mb-4 bg-yellow-500/10 border border-yellow-500/40 rounded-xl p-4 text-sm">
            <p className="font-semibold text-yellow-400 mb-1">⚠️ 인앱 브라우저 감지됨</p>
            <p className="text-zinc-300 text-xs leading-relaxed">
              카카오톡·인스타그램 등 앱 내 브라우저에서는 구글 로그인이 차단됩니다.<br />
              <span className="text-yellow-300 font-semibold">Safari 또는 Chrome</span>으로 열어서 로그인해 주세요.
            </p>
            <button
              onClick={() => {
                const url = window.location.href
                // 클립보드에 복사
                navigator.clipboard?.writeText(url).catch(() => {})
                alert('주소가 복사됐어요!\nSafari 또는 Chrome을 열고 붙여넣기 해주세요.')
              }}
              className="mt-2 text-xs bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 rounded-lg px-3 py-1.5 transition-colors"
            >
              🔗 주소 복사하기
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-zinc-800 rounded-xl p-6 flex flex-col gap-4">
          <h2 className="text-lg font-semibold">로그인</h2>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-zinc-400">이메일</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="bg-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-zinc-400">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="bg-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg py-2 text-sm font-semibold transition-colors"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-zinc-700" />
            <span className="text-xs text-zinc-500">또는</span>
            <div className="flex-1 h-px bg-zinc-700" />
          </div>
          <button
            type="button"
            onClick={() => signInWithGoogle()}
            disabled={inApp}
            className="flex items-center justify-center gap-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg py-2 text-sm font-semibold transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Google로 로그인{inApp ? ' (인앱 불가)' : ''}
          </button>
          <p className="text-center text-sm text-zinc-400">
            계정이 없으신가요?{' '}
            <Link href="/signup" className="text-blue-400 hover:underline">회원가입</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
