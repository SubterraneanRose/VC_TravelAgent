'use client';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 在客户端组件中，环境变量在构建时被内联
// 对于 Docker 部署，如果构建时环境变量为空，需要在运行时通过 API 获取
const getSupabaseConfig = () => {
  // 优先使用构建时内联的环境变量
  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  let supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  // 如果构建时没有环境变量，尝试从 window 获取（运行时注入）
  if (typeof window !== 'undefined') {
    const runtimeConfig = (window as any).__NEXT_DATA__?.env;
    if (runtimeConfig) {
      supabaseUrl = runtimeConfig.NEXT_PUBLIC_SUPABASE_URL || supabaseUrl;
      supabaseAnonKey = runtimeConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY || supabaseAnonKey;
    }
  }
  
  return { supabaseUrl, supabaseAnonKey };
};

// 检查是否在构建时（Next.js 构建阶段，SSR/SSG）
const isBuildTime = typeof window === 'undefined' && 
                    process.env.NODE_ENV === 'production' && 
                    !process.env.NEXT_PUBLIC_SUPABASE_URL;

const { supabaseUrl: initialUrl, supabaseAnonKey: initialKey } = getSupabaseConfig();

let supabase: SupabaseClient<any, 'public', any>;

if (!initialUrl || !initialKey) {
  const errorMsg = [
    '❌ Supabase 配置缺失！',
    '请在 .env.local 中配置以下变量：',
    '  NEXT_PUBLIC_SUPABASE_URL=你的Supabase项目URL',
    '  NEXT_PUBLIC_SUPABASE_ANON_KEY=你的Supabase anon key',
    '配置后请重启开发服务器（npm run dev）',
    '',
    '参考文档：supabase/README.md'
  ].join('\n');
  
  // 在构建时只警告，不抛出错误（因为环境变量会在运行时通过 Docker 提供）
  if (isBuildTime) {
    console.warn('⚠️ 构建时 Supabase 环境变量未配置（这是正常的，环境变量将在运行时提供）');
    // 创建一个临时的客户端，避免构建失败
    supabase = createClient('https://placeholder.supabase.co', 'placeholder-key') as SupabaseClient<any, 'public', any>;
  } else {
    // 在开发/运行时，如果环境变量不存在，记录错误但不抛出（避免页面崩溃）
    console.error(errorMsg);
    console.error('⚠️ Supabase 客户端将使用占位符，功能可能无法正常工作');
    console.error('💡 提示: 请确保在 Docker 容器运行时通过环境变量提供配置');
    supabase = createClient('https://placeholder.supabase.co', 'placeholder-key') as SupabaseClient<any, 'public', any>;
  }
} else {
  supabase = createClient(initialUrl, initialKey);
}

export { supabase };

