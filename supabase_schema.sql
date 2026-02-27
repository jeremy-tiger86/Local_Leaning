-- Supabase SQL Editor 에서 아래 코드를 실행해 주세요.

CREATE TABLE public.lectures (
  id text PRIMARY KEY,
  title text NOT NULL,
  instructor text,
  period text,
  target text,
  link text,
  lat double precision,
  lng double precision,
  address text,
  is_free boolean DEFAULT true,
  price text,
  category text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security (RLS) 설정 (우선 누구나 읽을 수 있도록 허용)
ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON public.lectures
  FOR SELECT USING (true);

-- Upsert 를 위해 Service Key 또는 Anon Key (여기의 경우 Next.js 서버에서 API 트래픽 수집용으로 일단 모두 접근 허용 혹은 서비스단에서만 쓰도록 보안 규칙 설정)
-- 현재 로직 상 API 라우트에서 Anon Key 로 Upsert 를 시도하고 있다면, Insert/Update 도 허용해주어야 합니다.
CREATE POLICY "Allow public insert" ON public.lectures
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update" ON public.lectures
  FOR UPDATE USING (true);
