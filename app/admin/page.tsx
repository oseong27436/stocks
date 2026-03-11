'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type User = { id: string; nickname: string; is_admin: boolean; created_at: string }
type Group = { id: string; name: string; created_at: string; created_by: string; user_profiles: { nickname: string } | null }

export default function AdminPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const t = data.session.access_token
      setToken(t)

      const res = await fetch('/api/admin', { headers: { Authorization: `Bearer ${t}` } })
      if (res.status === 401) { router.replace('/dashboard'); return }
      const json = await res.json()
      setUsers(json.users ?? [])
      setGroups(json.groups ?? [])
      setLoading(false)
    })
  }, [router])

  async function handleDelete(type: 'user' | 'group', id: string, name: string) {
    if (!confirm(`"${name}"을(를) 삭제하시겠습니까?`)) return
    const res = await fetch('/api/admin', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, id }),
    })
    const json = await res.json()
    if (!res.ok) { alert(json.error); return }
    if (type === 'user') setUsers(prev => prev.filter(u => u.id !== id))
    else setGroups(prev => prev.filter(g => g.id !== id))
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center text-zinc-400">로딩 중...</div>

  return (
    <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">🛠️ 관리자</h1>
        <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-zinc-200">← 대시보드</Link>
      </div>

      {/* 유저 목록 */}
      <h2 className="font-semibold mb-3">유저 ({users.length}명)</h2>
      <div className="flex flex-col gap-2 mb-8">
        {users.map(u => (
          <div key={u.id} className="bg-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <span className="font-semibold">{u.nickname}</span>
              {u.is_admin && <span className="ml-2 text-xs bg-blue-600 rounded px-1.5 py-0.5">관리자</span>}
              <p className="text-xs text-zinc-500 mt-0.5">{new Date(u.created_at).toLocaleDateString('ko-KR')}</p>
            </div>
            {!u.is_admin && (
              <button
                onClick={() => handleDelete('user', u.id, u.nickname)}
                className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
              >
                삭제
              </button>
            )}
          </div>
        ))}
      </div>

      {/* 그룹 목록 */}
      <h2 className="font-semibold mb-3">그룹 ({groups.length}개)</h2>
      <div className="flex flex-col gap-2">
        {groups.map(g => (
          <div key={g.id} className="bg-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <span className="font-semibold">{g.name}</span>
              <p className="text-xs text-zinc-500 mt-0.5">
                개설자: {g.user_profiles?.nickname ?? '-'} · {new Date(g.created_at).toLocaleDateString('ko-KR')}
              </p>
            </div>
            <button
              onClick={() => handleDelete('group', g.id, g.name)}
              className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
            >
              삭제
            </button>
          </div>
        ))}
        {groups.length === 0 && <p className="text-zinc-500 text-sm">그룹이 없습니다</p>}
      </div>
    </div>
  )
}
