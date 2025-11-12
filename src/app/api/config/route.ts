import { NextResponse } from 'next/server';

/**
 * 提供客户端配置信息
 * 用于在 Docker 容器中动态获取环境变量
 */
export async function GET() {
  return NextResponse.json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    amapApiKey: process.env.NEXT_PUBLIC_AMAP_API_KEY || '',
    amapWebServiceKey: process.env.NEXT_PUBLIC_AMAP_WEB_SERVICE_KEY || '',
  });
}

