-- 创建 trips 表
CREATE TABLE IF NOT EXISTS public.trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  destination TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days INTEGER NOT NULL,
  budget DECIMAL(10, 2),
  preferences JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建 day_plans 表
CREATE TABLE IF NOT EXISTS public.day_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  day_index INTEGER NOT NULL,
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(trip_id, day_index)
);

-- 创建 plan_items 表
CREATE TABLE IF NOT EXISTS public.plan_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  day_plan_id UUID REFERENCES public.day_plans(id) ON DELETE CASCADE NOT NULL,
  time_range TEXT,
  type TEXT NOT NULL CHECK (type IN ('spot', 'food', 'hotel', 'transport')),
  name TEXT NOT NULL,
  address TEXT,
  lat DECIMAL(10, 7),
  lng DECIMAL(10, 7),
  notes TEXT,
  cost_est DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建 expenses 表
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('机酒', '交通', '餐饮', '门票', '杂项')),
  amount DECIMAL(10, 2) NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON public.trips(user_id);
CREATE INDEX IF NOT EXISTS idx_day_plans_trip_id ON public.day_plans(trip_id);
CREATE INDEX IF NOT EXISTS idx_plan_items_day_plan_id ON public.plan_items(day_plan_id);
CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON public.expenses(trip_id);

-- 启用 RLS (Row Level Security)
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.day_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略（暂时允许所有操作，后续接入 Auth 后需改为基于 user_id 的权限）
CREATE POLICY "Allow all for trips" ON public.trips FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for day_plans" ON public.day_plans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for plan_items" ON public.plan_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for expenses" ON public.expenses FOR ALL USING (true) WITH CHECK (true);

