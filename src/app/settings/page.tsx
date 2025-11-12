"use client";
import { Form, Input, Button, Card, Typography, Space, message } from 'antd';

export default function SettingsPage() {
  const [form] = Form.useForm();

  const onFinish = async (values: Record<string, string>) => {
    // In a real app, persist securely (server or encrypted storage)
    localStorage.setItem('settings', JSON.stringify(values));
    message.success('已保存本地设置（请勿将 Key 提交到仓库）');
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Typography.Title level={3}>设置</Typography.Title>
      <Card>
        <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{
          NEXT_PUBLIC_AMAP_API_KEY: '',
          LLM_API_KEY: '',
        }}>
          <Form.Item label="地图 API Key（高德）" name="NEXT_PUBLIC_AMAP_API_KEY">
            <Input.Password placeholder="请输入高德地图 Web API Key" />
          </Form.Item>
          <Form.Item label="LLM API Key（阿里云百炼）" name="LLM_API_KEY">
            <Input.Password placeholder="请输入 LLM Key" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">保存</Button>
          </Form.Item>
        </Form>
        <Typography.Paragraph type="secondary">
          密钥仅保存在本地存储用于开发调试。生产环境请改为服务端安全托管。
        </Typography.Paragraph>
      </Card>
    </Space>
  );
}




