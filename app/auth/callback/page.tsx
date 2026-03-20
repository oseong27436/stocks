'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    // supabase가 URL의 code를 감지해서 자동으로 세션 교환
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        router.replace('/dashboard')
      } else if (event === 'INITIAL_SESSION' && !session) {
        router.replace('/login?error=auth_failed')
      }
    })
    return () => subscription.unsubscribe()
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-zinc-400 text-sm">로그인 처리 중...</p>
    </div>
  )
}
