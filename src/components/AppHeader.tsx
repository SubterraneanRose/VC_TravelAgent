"use client";
import React from 'react';
import Link from 'next/link';
import { Layout, Menu, Typography } from 'antd';

export default function AppHeader() {
  return (
    <Layout.Header style={{ display: 'flex', alignItems: 'center' }}>
      <Typography.Title level={4} style={{ color: '#fff', margin: 0, flex: 1 }}>
        <Link href="/" style={{ color: '#fff' }}>AI 旅行规划师</Link>
      </Typography.Title>
      <Menu
        theme="dark"
        mode="horizontal"
        selectable={false}
        items={[
          { key: 'home', label: <Link href="/">首页</Link> },
          { key: 'trips', label: <Link href="/trips">行程</Link> },
          { key: 'new', label: <Link href="/new">新建行程</Link> },
          { key: 'settings', label: <Link href="/settings">设置</Link> },
        ]}
      />
    </Layout.Header>
  );
}



