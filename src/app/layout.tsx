import './globals.css';
import React from 'react';
import type { Metadata } from 'next';
import AppHeader from '../components/AppHeader';
import { AntdConfigProvider } from '../lib/antd-config';

export const metadata: Metadata = {
  title: 'AI Travel Planner',
  description: 'Web 版 AI 旅行规划师',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body style={{ minHeight: '100vh', margin: 0 }}>
        <AntdConfigProvider>
          <AppHeader />
          <main style={{ padding: 24 }}>
            {children}
          </main>
        </AntdConfigProvider>
      </body>
    </html>
  );
}


