import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function verifyAdmin(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data } = await adminSupabase.auth.getUser(token)
  if (!data.user) return null
  const { data: profile } = await adminSupabase
    .from('user_profiles')
    .select('is_admin')
    .eq('id', data.user.id)
    .single()
  return profile?.is_admin ? data.user : null
}

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: users }, { data: groups }] = await Promise.all([
    adminSupabase
      .from('user_profiles')
      .select('id, nickname, is_admin, created_at')
      .order('created_at', { ascending: false }),
    adminSupabase
      .from('groups')
      .select('id, name, created_at, created_by, user_profiles!groups_created_by_fkey(nickname)')
      .order('created_at', { ascending: false }),
  ])

  return NextResponse.json({ users, groups })
}

export async function DELETE(req: NextRequest) {
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { type, id } = await req.json()

  if (type === 'user') {
    if (id === admin.id) return NextResponse.json({ error: '자기 자신은 삭제할 수 없습니다' }, { status: 400 })
    await adminSupabase.auth.admin.deleteUser(id)
  } else if (type === 'group') {
    await adminSupabase.from('groups').delete().eq('id', id)
  }

  return NextResponse.json({ success: true })
}
