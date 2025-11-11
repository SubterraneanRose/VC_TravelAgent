"use client";
import { ConfigProvider, App as AntApp, Typography, Button } from 'antd';
import Link from 'next/link';

export default function HomePage() {
  return (
    <ConfigProvider>
      <AntApp>
        <Typography.Title level={3}>欢迎使用 AI 旅行规划师</Typography.Title>
        <Typography.Paragraph>
          通过语音或文字输入旅行需求，系统将自动生成包含交通、住宿、景点与餐饮建议的行程方案。
        </Typography.Paragraph>
        <Button type="primary">
          <Link href="/new">立即开始</Link>
        </Button>
      </AntApp>
    </ConfigProvider>
  );
}


