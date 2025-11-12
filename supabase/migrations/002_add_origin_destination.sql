-- 添加起点和终点字段到 trips 表
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS origin TEXT,
ADD COLUMN IF NOT EXISTS destination_end TEXT;

-- 添加注释
COMMENT ON COLUMN public.trips.origin IS '出发地/起点';
COMMENT ON COLUMN public.trips.destination_end IS '终点（如果与目的地不同）';

