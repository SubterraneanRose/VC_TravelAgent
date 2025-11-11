"use client";
import { Form, Input, InputNumber, Select, DatePicker, Button, Card, Typography, Space } from 'antd';
const { RangePicker } = DatePicker;

export default function NewTripPage() {
  const [form] = Form.useForm();

  const onFinish = async (values: Record<string, any>) => {
    console.log('new trip request:', values);
    // TODO: call LLM API to generate itinerary draft
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Typography.Title level={3}>新建行程</Typography.Title>
      <Card>
        <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{
          people: 2,
          budget: 10000,
          preferences: ['美食'],
        }}>
          <Form.Item label="目的地" name="destination" rules={[{ required: true, message: '请输入目的地' }]}>
            <Input placeholder="例如：日本 东京/大阪" />
          </Form.Item>
          <Form.Item label="日期范围" name="dateRange" rules={[{ required: true, message: '请选择日期范围' }]}>
            <RangePicker />
          </Form.Item>
          <Form.Item label="预算(元)" name="budget"><InputNumber min={0} step={100} style={{ width: 200 }} /></Form.Item>
          <Form.Item label="同行人数" name="people"><InputNumber min={1} max={10} style={{ width: 200 }} /></Form.Item>
          <Form.Item label="偏好" name="preferences">
            <Select mode="multiple" options={[
              { value: '美食', label: '美食' },
              { value: '亲子', label: '亲子' },
              { value: '动漫', label: '动漫' },
              { value: '自然', label: '自然' },
              { value: '文化', label: '文化' },
            ]} style={{ maxWidth: 480 }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">生成行程草案</Button>
          </Form.Item>
        </Form>
      </Card>
    </Space>
  );
}



