"use client";
import { useState } from 'react';
import { Form, Input, InputNumber, Select, DatePicker, Button, Card, Typography, Space, message, Alert, Divider } from 'antd';
import { useRouter } from 'next/navigation';
import dayjs, { Dayjs } from 'dayjs';
import { supabase } from '../../lib/supabase/client';
import VoiceInput from '../../components/VoiceInput';

// 标记为动态渲染，避免构建时预渲染
export const dynamic = 'force-dynamic';

const { RangePicker } = DatePicker;

// 最大行程天数限制（根据 token 限制设置）
const MAX_TRIP_DAYS = 10;

// 扩展的偏好选项
const PREFERENCE_OPTIONS = [
  { value: '美食', label: '美食', category: '体验' },
  { value: '亲子', label: '亲子', category: '人群' },
  { value: '动漫', label: '动漫', category: '兴趣' },
  { value: '自然', label: '自然', category: '体验' },
  { value: '文化', label: '文化', category: '体验' },
  { value: '历史', label: '历史', category: '兴趣' },
  { value: '艺术', label: '艺术', category: '兴趣' },
  { value: '购物', label: '购物', category: '体验' },
  { value: '夜生活', label: '夜生活', category: '体验' },
  { value: '户外', label: '户外', category: '体验' },
  { value: '摄影', label: '摄影', category: '兴趣' },
  { value: '温泉', label: '温泉', category: '体验' },
  { value: '海滩', label: '海滩', category: '体验' },
  { value: '登山', label: '登山', category: '体验' },
  { value: '滑雪', label: '滑雪', category: '体验' },
  { value: '潜水', label: '潜水', category: '体验' },
  { value: '蜜月', label: '蜜月', category: '人群' },
  { value: '商务', label: '商务', category: '人群' },
  { value: '学生', label: '学生', category: '人群' },
  { value: '老年', label: '老年', category: '人群' },
  { value: '背包客', label: '背包客', category: '人群' },
  { value: '奢华', label: '奢华', category: '风格' },
  { value: '经济', label: '经济', category: '风格' },
  { value: '慢旅行', label: '慢旅行', category: '风格' },
  { value: '冒险', label: '冒险', category: '风格' },
];

export default function NewTripPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [parsingVoice, setParsingVoice] = useState(false);
  const router = useRouter();

  const onFinish = async (values: Record<string, any>) => {
    try {
      setLoading(true);
      const [startDate, endDate] = values.dateRange as [Dayjs, Dayjs];
      const days = endDate.diff(startDate, 'day') + 1;

      // 验证行程天数
      if (days > MAX_TRIP_DAYS) {
        message.error(`行程天数不能超过 ${MAX_TRIP_DAYS} 天，当前选择为 ${days} 天。请缩短行程时间或分批规划。`);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('trips')
        .insert({
          title: `${values.destination} ${days}日游`,
          destination: values.destination,
          origin: values.origin || null,
          destination_end: values.destinationEnd || null,
          start_date: startDate.format('YYYY-MM-DD'),
          end_date: endDate.format('YYYY-MM-DD'),
          days,
          budget: values.budget || null,
          preferences: values.preferences || [],
          people: values.people || 2,
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

  /**
   * 处理语音识别结果
   * 使用 LLM 解析语音输入的自然语言，提取结构化信息
   */
  const handleVoiceResult = async (text: string) => {
    if (!text || text.trim().length === 0) {
      return;
    }

    try {
      setParsingVoice(true);
      message.loading({ content: '正在解析语音输入...', key: 'parsing' });

      // 调用 LLM 解析语音输入
      const response = await fetch('/api/parse-voice-input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '解析失败');
      }

      // 填充表单
      if (result.data) {
        const data = result.data;
        
        // 更新表单字段
        const formValues: Record<string, any> = {};
        
        if (data.origin) formValues.origin = data.origin;
        if (data.destination) formValues.destination = data.destination;
        if (data.destinationEnd) formValues.destinationEnd = data.destinationEnd;
        if (data.people) formValues.people = data.people;
        if (data.budget) formValues.budget = data.budget;
        if (data.preferences && data.preferences.length > 0) {
          formValues.preferences = data.preferences;
        }
        if (data.startDate && data.endDate) {
          formValues.dateRange = [dayjs(data.startDate), dayjs(data.endDate)];
        }

        form.setFieldsValue(formValues);
        message.success({ content: '语音输入已解析并填充表单', key: 'parsing' });
      } else {
        message.warning({ content: '未能从语音输入中提取有效信息，请手动填写', key: 'parsing' });
      }
    } catch (err: any) {
      console.error('解析语音输入失败:', err);
      message.error({ content: '解析失败: ' + (err.message || '未知错误'), key: 'parsing' });
    } finally {
      setParsingVoice(false);
    }
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Typography.Title level={3}>新建行程</Typography.Title>
      <Card>
        <Alert
          message="使用提示"
          description={
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <div>• 行程天数限制：为了确保 AI 能够生成完整详细的行程，单次行程天数建议不超过 <strong>{MAX_TRIP_DAYS} 天</strong></div>
              <div>• 地图提示：高德地图主要支持中国境内地址的地理编码，外国城市（如日本、俄罗斯、欧洲等）的地点可能无法在地图上显示标记点</div>
              <div>• 如果您的行程超过 {MAX_TRIP_DAYS} 天，建议拆分为多个行程分别规划</div>
            </Space>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{
          people: 2,
          budget: 10000,
          preferences: ['美食'],
        }}>
          {/* 语音输入 */}
          <Card size="small" style={{ marginBottom: 16, background: '#f5f5f5' }}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Typography.Text strong>语音输入（可选）</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                点击"开始语音输入"，说出您的旅行需求，系统会自动识别并填充表单。例如："我想去日本东京，5天，预算1万元，喜欢美食和动漫，带孩子"
              </Typography.Text>
              <Alert
                message="语音输入使用说明"
                description={
                  <Space direction="vertical" size="small" style={{ width: '100%', marginTop: 8 }}>
                    <Typography.Text style={{ fontSize: 12 }}>
                      <strong>浏览器要求：</strong>请使用 Chrome、Edge 或 Safari 浏览器
                    </Typography.Text>
                    <Typography.Text style={{ fontSize: 12 }}>
                      <strong>网络要求：</strong>需要 HTTPS 连接（本地开发环境 localhost 不受限制）
                    </Typography.Text>
                    <Typography.Text style={{ fontSize: 12, color: '#ff4d4f' }}>
                      <strong>⚠️ 可能存在的问题：</strong>
                    </Typography.Text>
                    <Typography.Text style={{ fontSize: 11, marginLeft: 16 }}>
                      • 无法连接到语音识别服务（Chrome 使用 Google 服务，可能需要科学上网）<br/>
                      • 防火墙或代理可能阻止连接<br/>
                      • 网络不稳定可能导致识别失败<br/>
                      • 如果语音识别不可用，请使用"手动输入"功能直接输入文本
                    </Typography.Text>
                  </Space>
                }
                type="info"
                showIcon
                style={{ marginTop: 8 }}
              />
              <VoiceInput
                onResult={handleVoiceResult}
                onError={(error) => {
                  // 错误已在 VoiceInput 组件中处理
                }}
              />
            </Space>
          </Card>

          <Divider>或手动填写</Divider>

          <Form.Item 
            label="出发地/起点" 
            name="origin" 
            tooltip="例如：北京、上海、您的居住城市"
          >
            <Input placeholder="例如：北京" />
          </Form.Item>
          
          <Form.Item 
            label="目的地" 
            name="destination" 
            rules={[{ required: true, message: '请输入目的地' }]}
            tooltip="主要旅行目的地"
          >
            <Input placeholder="例如：日本 东京/大阪" />
          </Form.Item>
          
          <Form.Item 
            label="终点（可选）" 
            name="destinationEnd"
            tooltip="如果返程地点与出发地不同，请填写终点"
          >
            <Input placeholder="例如：上海（如果与出发地不同）" />
          </Form.Item>
          
          <Form.Item 
            label="日期范围" 
            name="dateRange" 
            rules={[
              { required: true, message: '请选择日期范围' },
              {
                validator: (_, value) => {
                  if (!value || !value[0] || !value[1]) {
                    return Promise.resolve();
                  }
                  const days = value[1].diff(value[0], 'day') + 1;
                  if (days > MAX_TRIP_DAYS) {
                    return Promise.reject(new Error(`行程天数不能超过 ${MAX_TRIP_DAYS} 天，当前选择为 ${days} 天`));
                  }
                  return Promise.resolve();
                },
              },
            ]}
            tooltip={`建议行程天数不超过 ${MAX_TRIP_DAYS} 天，以确保 AI 能够生成完整详细的行程计划`}
          >
            <RangePicker 
              style={{ width: '100%' }} 
              disabledDate={(current) => {
                // 限制选择范围，避免选择过长的日期范围
                if (!current) return false;
                const formValues = form.getFieldsValue();
                if (formValues.dateRange && formValues.dateRange[0]) {
                  const startDate = formValues.dateRange[0];
                  // 使用 clone() 避免修改原对象
                  const maxDate = startDate.clone().add(MAX_TRIP_DAYS - 1, 'day');
                  // 如果当前日期在起始日期之后超过 MAX_TRIP_DAYS 天，则禁用
                  if (current.isAfter(maxDate, 'day')) {
                    return true;
                  }
                }
                return false;
              }}
            />
          </Form.Item>
          
          <Form.Item label="预算(元)" name="budget">
            <InputNumber min={0} step={100} style={{ width: 200 }} placeholder="总预算" />
          </Form.Item>
          
          <Form.Item label="同行人数" name="people">
            <InputNumber min={1} max={20} style={{ width: 200 }} />
          </Form.Item>
          
          <Form.Item 
            label="旅行偏好" 
            name="preferences"
            tooltip="可选择多个偏好，帮助 AI 生成更符合您需求的行程"
          >
            <Select 
              mode="multiple" 
              options={PREFERENCE_OPTIONS}
              style={{ width: '100%' }}
              placeholder="请选择您的旅行偏好"
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
          
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} size="large">
              创建行程
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </Space>
  );
}




