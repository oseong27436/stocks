import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type UserProfile = {
  id: string
  nickname: string
  created_at: string
}

export type Group = {
  id: string
  name: string
  created_by: string
  created_at: string
}

export type GroupMember = {
  id: string
  group_id: string
  user_id: string
  joined_at: string
  user_profiles?: UserProfile
}

export type Holding = {
  id: string
  user_id: string
  symbol: string
  name: string | null
  quantity: number
  avg_price: number
  created_at: string
}
