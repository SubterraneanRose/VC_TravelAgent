"use client";
import { useState } from 'react';
import { Form, Input, InputNumber, Select, DatePicker, Button, Card, Typography, Space, message } from 'antd';
import { useRouter } from 'next/navigation';
import dayjs, { Dayjs } from 'dayjs';
import { supabase } from '../../lib/supabase/client';

const { RangePicker } = DatePicker;

export default function NewTripPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onFinish = async (values: Record<string, any>) => {
    try {
      setLoading(true);
      const [startDate, endDate] = values.dateRange as [Dayjs, Dayjs];
      const days = endDate.diff(startDate, 'day') + 1;

      const { data, error } = await supabase
        .from('trips')
        .insert({
          title: `${values.destination} ${days}日游`,
          destination: values.destination,
          start_date: startDate.format('YYYY-MM-DD'),
          end_date: endDate.format('YYYY-MM-DD'),
          days,
          budget: values.budget || null,
          preferences: values.preferences || [],
        })
        .select()
        .single();

      if (error) throw error;

      message.success('行程创建成功！');
      router.push(`/trips/${data.id}`);
    } catch (err: any) {
      console.error('创建行程失败:', err);
      message.error('创建行程失败: ' + (err.message || '未知错误'));
    } finally {
      setLoading(false);
    }
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
            <Button type="primary" htmlType="submit" loading={loading}>创建行程</Button>
          </Form.Item>
        </Form>
      </Card>
    </Space>
  );
}




