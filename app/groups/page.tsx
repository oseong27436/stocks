'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase, Group } from '@/lib/supabase'

export default function GroupsPage() {
  const router = useRouter()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const uid = data.session.user.id
      setUserId(uid)
      await loadGroups(uid)
      setLoading(false)
    })
  }, [router])

  async function loadGroups(uid: string) {
    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', uid)
    if (!memberships || memberships.length === 0) { setGroups([]); return }
    const ids = memberships.map((m: any) => m.group_id)
    const { data } = await supabase.from('groups').select('*').in('id', ids)
    setGroups(data ?? [])
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setSaving(true)
    const { data: group } = await supabase
      .from('groups')
      .insert({ name: groupName, created_by: userId })
      .select()
      .single()
    if (group) {
      await supabase.from('group_members').insert({ group_id: group.id, user_id: userId })
      await loadGroups(userId)
    }
    setGroupName('')
    setShowCreate(false)
    setSaving(false)
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setError('')
    setSaving(true)
    const { data: group } = await supabase.from('groups').select('*').eq('id', inviteCode.trim()).single()
    if (!group) { setError('그룹을 찾을 수 없습니다.'); setSaving(false); return }
    const { error: joinErr } = await supabase.from('group_members').insert({ group_id: group.id, user_id: userId })
    if (joinErr) { setError('이미 가입된 그룹이거나 오류가 발생했습니다.'); setSaving(false); return }
    await loadGroups(userId)
    setInviteCode('')
    setSaving(false)
  }



  return (
    <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-zinc-400 hover:text-zinc-200 text-sm">← 대시보드</Link>
          <h1 className="text-xl font-bold">👥 그룹</h1>
        </div>
        <button onClick={() => setShowCreate(true)} className="text-sm bg-blue-600 hover:bg-blue-700 rounded-lg px-3 py-1.5 transition-colors">
          + 그룹 만들기
        </button>
      </div>

      {/* 그룹 참여 */}
      <div className="bg-zinc-800 rounded-xl p-4 mb-6">
        <h2 className="text-sm font-semibold mb-3 text-zinc-300">그룹 ID로 참여</h2>
        <form onSubmit={handleJoin} className="flex gap-2">
          <input
            value={inviteCode}
            onChange={e => setInviteCode(e.target.value)}
            placeholder="그룹 ID 붙여넣기"
            required
            className="flex-1 bg-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" disabled={saving} className="bg-zinc-600 hover:bg-zinc-500 disabled:opacity-50 rounded-lg px-4 py-2 text-sm transition-colors">
            참여
          </button>
        </form>
        {error && <p className="mt-2 text-red-400 text-xs">{error}</p>}
      </div>

      {/* 그룹 목록 */}
      {groups.length === 0 ? (
        <div className="bg-zinc-800 rounded-xl p-8 text-center text-zinc-400 text-sm">
          참여한 그룹이 없습니다.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map(g => (
            <Link key={g.id} href={`/groups/${g.id}`} className="bg-zinc-800 hover:bg-zinc-700 rounded-xl p-4 flex items-center justify-between transition-colors">
              <div>
                <p className="font-semibold">{g.name}</p>
                <p className="text-xs text-zinc-500 mt-0.5">ID: {g.id.slice(0, 8)}...</p>
              </div>
              <span className="text-zinc-400">→</span>
            </Link>
          ))}
        </div>
      )}

      {/* 그룹 만들기 모달 */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center px-4 z-50">
          <form onSubmit={handleCreate} className="bg-zinc-800 rounded-xl p-6 w-full max-w-sm flex flex-col gap-4">
            <h3 className="font-semibold">그룹 만들기</h3>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-zinc-400">그룹 이름</label>
              <input
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                placeholder="예: 나스닥 친구들"
                required
                className="bg-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowCreate(false)} className="flex-1 bg-zinc-700 hover:bg-zinc-600 rounded-lg py-2 text-sm transition-colors">취소</button>
              <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg py-2 text-sm font-semibold transition-colors">
                {saving ? '만드는 중...' : '만들기'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
