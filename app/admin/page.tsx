'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type User = { id: string; nickname: string; is_admin: boolean; created_at: string }
type Group = { id: string; name: string; created_at: string; created_by: string; user_profiles: { nickname: string } | null }

type UserDetail = {
  id: string
  email: string | null
  nickname: string
  is_admin: boolean
  created_at: string
  groups: { id: string; name: string }[]
  holdings: { symbol: string; quantity: number; avg_price: number }[]
}

type GroupDetail = {
  group: { id: string; name: string; created_at: string; user_profiles: { nickname: string } | null }
  members: { user_id: string; joined_at: string; user_profiles: { nickname: string } | null }[]
}

export default function AdminPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState('')
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null)
  const [groupDetail, setGroupDetail] = useState<GroupDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

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

  async function openUserDetail(id: string) {
    setDetailLoading(true)
    setUserDetail(null)
    setGroupDetail(null)
    const res = await fetch(`/api/admin?detail=user&id=${id}`, { headers: { Authorization: `Bearer ${token}` } })
    const json = await res.json()
    setUserDetail(json)
    setDetailLoading(false)
  }

  async function openGroupDetail(id: string) {
    setDetailLoading(true)
    setGroupDetail(null)
    setUserDetail(null)
    const res = await fetch(`/api/admin?detail=group&id=${id}`, { headers: { Authorization: `Bearer ${token}` } })
    const json = await res.json()
    setGroupDetail(json)
    setDetailLoading(false)
  }

  async function handleDelete(type: 'user' | 'group', id: string, name: string) {
    if (!confirm(`"${name}"을(를) 삭제하시겠습니까?`)) return
    const res = await fetch('/api/admin', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, id }),
    })
    const json = await res.json()
    if (!res.ok) { alert(json.error); return }
    if (type === 'user') {
      setUsers(prev => prev.filter(u => u.id !== id))
      setUserDetail(null)
    } else {
      setGroups(prev => prev.filter(g => g.id !== id))
      setGroupDetail(null)
    }
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
          <div
            key={u.id}
            onClick={() => openUserDetail(u.id)}
            className="bg-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer hover:ring-1 hover:ring-zinc-600 transition-all"
          >
            <div>
              <span className="font-semibold">{u.nickname}</span>
              {u.is_admin && <span className="ml-2 text-xs bg-blue-600 rounded px-1.5 py-0.5">관리자</span>}
              <p className="text-xs text-zinc-500 mt-0.5">{new Date(u.created_at).toLocaleDateString('ko-KR')}</p>
            </div>
            <span className="text-xs text-zinc-600">→</span>
          </div>
        ))}
      </div>

      {/* 그룹 목록 */}
      <h2 className="font-semibold mb-3">그룹 ({groups.length}개)</h2>
      <div className="flex flex-col gap-2">
        {groups.map(g => (
          <div
            key={g.id}
            onClick={() => openGroupDetail(g.id)}
            className="bg-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer hover:ring-1 hover:ring-zinc-600 transition-all"
          >
            <div>
              <span className="font-semibold">{g.name}</span>
              <p className="text-xs text-zinc-500 mt-0.5">
                개설자: {g.user_profiles?.nickname ?? '-'} · {new Date(g.created_at).toLocaleDateString('ko-KR')}
              </p>
            </div>
            <span className="text-xs text-zinc-600">→</span>
          </div>
        ))}
        {groups.length === 0 && <p className="text-zinc-500 text-sm">그룹이 없습니다</p>}
      </div>

      {/* 유저 상세 팝업 */}
      {(detailLoading && !groupDetail) || userDetail ? (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center px-4 z-50" onClick={() => setUserDetail(null)}>
          <div className="bg-zinc-800 rounded-xl p-6 w-full max-w-md flex flex-col gap-4" onClick={e => e.stopPropagation()}>
            {detailLoading ? (
              <p className="text-zinc-400 text-sm text-center py-4">불러오는 중...</p>
            ) : userDetail && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg">{userDetail.nickname}</h3>
                  {userDetail.is_admin && <span className="text-xs bg-blue-600 rounded px-2 py-0.5">관리자</span>}
                </div>

                <div className="flex flex-col gap-2.5 text-sm">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-zinc-500">User ID</span>
                    <span className="font-mono text-xs text-zinc-300 break-all select-all">{userDetail.id}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-zinc-500">이메일</span>
                    <span className="text-zinc-300">{userDetail.email ?? '-'}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-zinc-500">가입일</span>
                    <span className="text-zinc-300">{new Date(userDetail.created_at).toLocaleString('ko-KR')}</span>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-zinc-500 mb-1.5">속한 그룹 ({userDetail.groups.length})</p>
                  {userDetail.groups.length === 0
                    ? <p className="text-xs text-zinc-600">없음</p>
                    : <div className="flex flex-wrap gap-1.5">
                        {userDetail.groups.map(g => (
                          <span key={g.id} className="text-xs bg-zinc-700 rounded px-2 py-1">{g.name}</span>
                        ))}
                      </div>
                  }
                </div>

                <div>
                  <p className="text-xs text-zinc-500 mb-1.5">보유 종목 ({userDetail.holdings.length})</p>
                  {userDetail.holdings.length === 0
                    ? <p className="text-xs text-zinc-600">없음</p>
                    : <div className="flex flex-col gap-1">
                        {userDetail.holdings.map(h => (
                          <div key={h.symbol} className="flex justify-between text-xs bg-zinc-700 rounded px-3 py-1.5">
                            <span className="font-semibold">{h.symbol}</span>
                            <span className="text-zinc-400">{h.quantity}주 · 평단 ${h.avg_price}</span>
                          </div>
                        ))}
                      </div>
                  }
                </div>

                <div className="flex gap-2 pt-1">
                  <button onClick={() => setUserDetail(null)} className="flex-1 bg-zinc-700 hover:bg-zinc-600 rounded-lg py-2 text-sm transition-colors">닫기</button>
                  {!userDetail.is_admin && (
                    <button
                      onClick={() => handleDelete('user', userDetail.id, userDetail.nickname)}
                      className="flex-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg py-2 text-sm transition-colors"
                    >
                      삭제
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {/* 그룹 상세 팝업 */}
      {(detailLoading && !userDetail) || groupDetail ? (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center px-4 z-50" onClick={() => setGroupDetail(null)}>
          <div className="bg-zinc-800 rounded-xl p-6 w-full max-w-md flex flex-col gap-4" onClick={e => e.stopPropagation()}>
            {detailLoading ? (
              <p className="text-zinc-400 text-sm text-center py-4">불러오는 중...</p>
            ) : groupDetail && (
              <>
                <h3 className="font-bold text-lg">{groupDetail.group.name}</h3>

                <div className="flex flex-col gap-2.5 text-sm">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-zinc-500">Group ID</span>
                    <span className="font-mono text-xs text-zinc-300 break-all select-all">{groupDetail.group.id}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-zinc-500">개설자</span>
                    <span className="text-zinc-300">{groupDetail.group.user_profiles?.nickname ?? '-'}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-zinc-500">개설일</span>
                    <span className="text-zinc-300">{new Date(groupDetail.group.created_at).toLocaleString('ko-KR')}</span>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-zinc-500 mb-1.5">멤버 ({groupDetail.members.length}명)</p>
                  {groupDetail.members.length === 0
                    ? <p className="text-xs text-zinc-600">없음</p>
                    : <div className="flex flex-col gap-1">
                        {groupDetail.members.map(m => (
                          <div key={m.user_id} className="flex justify-between text-xs bg-zinc-700 rounded px-3 py-1.5">
                            <span className="font-semibold">{m.user_profiles?.nickname ?? '-'}</span>
                            <span className="text-zinc-400">{new Date(m.joined_at).toLocaleDateString('ko-KR')} 가입</span>
                          </div>
                        ))}
                      </div>
                  }
                </div>

                <div className="flex gap-2 pt-1">
                  <button onClick={() => setGroupDetail(null)} className="flex-1 bg-zinc-700 hover:bg-zinc-600 rounded-lg py-2 text-sm transition-colors">닫기</button>
                  <button
                    onClick={() => handleDelete('group', groupDetail.group.id, groupDetail.group.name)}
                    className="flex-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg py-2 text-sm transition-colors"
                  >
                    삭제
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
