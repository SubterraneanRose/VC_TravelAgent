"use client";
import { Typography, Button, Alert, Space } from 'antd';
import Link from 'next/link';
import { InfoCircleOutlined } from '@ant-design/icons';

export default function HomePage() {
  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Typography.Title level={3}>欢迎使用 AI 旅行规划师</Typography.Title>
      <Typography.Paragraph>
        通过语音或文字输入旅行需求，系统将自动生成包含交通、住宿、景点与餐饮建议的行程方案。
      </Typography.Paragraph>
      
      <Alert
        message="操作提示"
        description={
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div>• 生成行程计划时，AI 需要一些时间分析和规划，请耐心等待</div>
            <div>• 地图标记点加载需要地理编码处理，可能需要 3-5 秒时间</div>
            <div>• 如果遇到加载缓慢，可能是网络或 API 响应延迟，请稍后重试</div>
          </Space>
        }
        type="info"
        icon={<InfoCircleOutlined />}
        showIcon
        style={{ marginBottom: 16 }}
      />
      
      <Link href="/new">
        <Button type="primary" size="large">立即开始</Button>
      </Link>
    </Space>
  );
}


