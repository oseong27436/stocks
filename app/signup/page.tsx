'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signUp } from '@/lib/auth'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signUp(email, password, nickname)
      router.replace('/dashboard')
    } catch (e: any) {
      setError(e.message || '회원가입 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-center text-2xl font-bold">📈 Stocks</h1>
        <p className="mb-8 text-center text-zinc-400 text-sm">포트폴리오 & 그룹 수익 비교</p>
        <form onSubmit={handleSubmit} className="bg-zinc-800 rounded-xl p-6 flex flex-col gap-4">
          <h2 className="text-lg font-semibold">회원가입</h2>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-zinc-400">닉네임</label>
            <input
              type="text"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              required
              placeholder="닉네임 입력"
              className="bg-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
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
              minLength={6}
              className="bg-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg py-2 text-sm font-semibold transition-colors"
          >
            {loading ? '가입 중...' : '가입하기'}
          </button>
          <p className="text-center text-sm text-zinc-400">
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="text-blue-400 hover:underline">로그인</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
