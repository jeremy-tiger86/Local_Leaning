import { createClient } from '@supabase/supabase-js'

// Vercel 환경에서 환경변수 누락 시 빌드 에러를 막기 위한 임시 폴백 값
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
