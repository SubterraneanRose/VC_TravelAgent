import './globals.css';
import React from 'react';
import type { Metadata } from 'next';
import AppHeader from '../components/AppHeader';

export const metadata: Metadata = {
  title: 'AI Travel Planner',
  description: 'Web 版 AI 旅行规划师',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body style={{ minHeight: '100vh', margin: 0 }}>
        <AppHeader />
        <main style={{ padding: 24 }}>
          {children}
        </main>
      </body>
    </html>
  );
}


