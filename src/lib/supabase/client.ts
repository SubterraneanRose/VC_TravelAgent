'use client';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMsg = [
    '❌ Supabase 配置缺失！',
    '请在 .env.local 中配置以下变量：',
    '  NEXT_PUBLIC_SUPABASE_URL=你的Supabase项目URL',
    '  NEXT_PUBLIC_SUPABASE_ANON_KEY=你的Supabase anon key',
    '配置后请重启开发服务器（npm run dev）',
    '',
    '参考文档：supabase/README.md'
  ].join('\n');
  console.error(errorMsg);
  
  // 抛出明确的错误，让开发者知道需要配置
  throw new Error('Supabase 环境变量未配置。请检查 .env.local 文件并重启开发服务器。');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

