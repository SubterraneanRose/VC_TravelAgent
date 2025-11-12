-- 添加 people 字段到 trips 表
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS people INTEGER DEFAULT 2;

-- 添加注释
COMMENT ON COLUMN public.trips.people IS '同行人数';

