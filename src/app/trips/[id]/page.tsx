"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, Typography, Spin, message, Button, Space, Descriptions, Tag, Timeline, Empty } from 'antd';
import Link from 'next/link';
import dayjs from 'dayjs';
import { supabase } from '../../../lib/supabase/client';

interface Trip {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  days: number;
  budget: number | null;
  preferences: string[];
  created_at: string;
}

interface DayPlan {
  id: string;
  day_index: number;
  summary: string | null;
  items: PlanItem[];
}

interface PlanItem {
  id: string;
  time_range: string | null;
  type: string;
  name: string;
  address: string | null;
  notes: string | null;
  cost_est: number | null;
}

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [dayPlans, setDayPlans] = useState<DayPlan[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (tripId) {
      loadTrip();
      loadDayPlans();
    }
  }, [tripId]);

  const loadTrip = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();

      if (error) throw error;
      setTrip(data);
    } catch (err: any) {
      console.error('加载行程失败:', err);
      message.error('加载行程失败: ' + (err.message || '未知错误'));
      router.push('/trips');
    } finally {
      setLoading(false);
    }
  };

  const loadDayPlans = async () => {
    try {
      const { data: plans, error: plansError } = await supabase
        .from('day_plans')
        .select('*')
        .eq('trip_id', tripId)
        .order('day_index', { ascending: true });

      if (plansError) throw plansError;

      if (plans && plans.length > 0) {
        const planIds = plans.map(p => p.id);
        const { data: items, error: itemsError } = await supabase
          .from('plan_items')
          .select('*')
          .in('day_plan_id', planIds)
          .order('time_range', { ascending: true });

        if (itemsError) throw itemsError;

        const plansWithItems = plans.map(plan => ({
          ...plan,
          items: (items || []).filter(item => item.day_plan_id === plan.id),
        }));

        setDayPlans(plansWithItems);
      }
    } catch (err: any) {
      console.error('加载每日计划失败:', err);
    }
  };

  const generateItinerary = async () => {
    if (!trip) return;

    try {
      setGenerating(true);
      // 保存旧的 planIds（在清空状态之前）
      const oldPlanIds = dayPlans.length > 0 ? dayPlans.map(p => p.id) : [];
      // 立即清空状态，让按钮可以再次点击
      setDayPlans([]);
      message.loading({ content: '正在生成行程计划，请稍候...', key: 'generating', duration: 0 });

      // 如果已有计划，先删除旧的
      if (oldPlanIds.length > 0) {
        try {
          // 先删除 plan_items
          const { error: itemsError } = await supabase
            .from('plan_items')
            .delete()
            .in('day_plan_id', oldPlanIds);
          if (itemsError) console.warn('删除 plan_items 失败:', itemsError);
        } catch (deleteError) {
          console.warn('删除 plan_items 时出错:', deleteError);
        }
      }
      
      // 删除该行程的所有 day_plans（更可靠的方式）
      try {
        const { error: plansError } = await supabase
          .from('day_plans')
          .delete()
          .eq('trip_id', trip.id);
        if (plansError) console.warn('删除 day_plans 失败:', plansError);
      } catch (deleteError) {
        console.warn('删除 day_plans 时出错:', deleteError);
      }

      const response = await fetch('/api/generate-itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: trip.destination,
          startDate: trip.start_date,
          endDate: trip.end_date,
          days: trip.days,
          budget: trip.budget,
          preferences: trip.preferences || [],
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '生成失败');
      }

      const itinerary = result.data;

      // 保存到数据库
      await saveItineraryToDatabase(itinerary);

      message.success({ content: '行程计划生成成功！', key: 'generating' });
      await loadDayPlans(); // 重新加载计划
    } catch (err: any) {
      console.error('生成行程失败:', err);
      message.error({ content: '生成失败: ' + (err.message || '未知错误'), key: 'generating' });
    } finally {
      setGenerating(false);
    }
  };

  const saveItineraryToDatabase = async (itinerary: any) => {
    if (!trip) return;

    try {
      for (const day of itinerary.days || []) {
        // 创建 day_plan
        const { data: dayPlan, error: dayPlanError } = await supabase
          .from('day_plans')
          .insert({
            trip_id: trip.id,
            day_index: day.dayIndex,
            summary: day.summary || day.theme,
          })
          .select()
          .single();

        if (dayPlanError) throw dayPlanError;

        // 创建 plan_items
        if (day.items && day.items.length > 0) {
          const itemsToInsert = day.items.map((item: any) => ({
            day_plan_id: dayPlan.id,
            time_range: item.timeRange || null,
            type: item.type || 'spot',
            name: item.name || '',
            address: item.address || null,
            notes: item.notes || null,
            cost_est: item.costEst || null,
          }));

          const { error: itemsError } = await supabase
            .from('plan_items')
            .insert(itemsToInsert);

          if (itemsError) throw itemsError;
        }
      }
    } catch (err: any) {
      console.error('保存行程到数据库失败:', err);
      throw err;
    }
  };

  if (loading) {
    return (
      <Spin size="large" style={{ display: 'block', textAlign: 'center', marginTop: 50 }} />
    );
  }

  if (!trip) {
    return (
      <div>
        <Typography.Title level={3}>行程不存在</Typography.Title>
        <Button onClick={() => router.push('/trips')}>返回行程列表</Button>
      </div>
    );
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Button onClick={() => router.push('/trips')}>
        ← 返回行程列表
      </Button>

      <Card>
        <Typography.Title level={2}>{trip.title}</Typography.Title>
        
        <Descriptions bordered column={2} style={{ marginTop: 24 }}>
          <Descriptions.Item label="目的地">{trip.destination}</Descriptions.Item>
          <Descriptions.Item label="行程天数">{trip.days} 天</Descriptions.Item>
          <Descriptions.Item label="出发日期">{trip.start_date}</Descriptions.Item>
          <Descriptions.Item label="结束日期">{trip.end_date}</Descriptions.Item>
          {trip.budget && (
            <Descriptions.Item label="预算">¥{trip.budget}</Descriptions.Item>
          )}
          <Descriptions.Item label="偏好">
            {trip.preferences && trip.preferences.length > 0 ? (
              <Space>
                {trip.preferences.map((pref, idx) => (
                  <Tag key={idx} color="blue">{pref}</Tag>
                ))}
              </Space>
            ) : (
              <Typography.Text type="secondary">未设置</Typography.Text>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {new Date(trip.created_at).toLocaleString('zh-CN')}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card 
        title="每日计划"
        extra={
          <Button 
            type="primary" 
            onClick={generateItinerary} 
            loading={generating}
            disabled={generating}
          >
            {dayPlans.length > 0 ? '重新生成' : '生成行程计划'}
          </Button>
        }
      >
        {dayPlans.length === 0 ? (
          <Empty 
            description="暂无行程计划"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" onClick={generateItinerary} loading={generating}>
              生成行程计划
            </Button>
          </Empty>
        ) : (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {dayPlans.map((plan) => (
              <Card key={plan.id} size="small" title={`第 ${plan.day_index} 天${plan.summary ? ` - ${plan.summary}` : ''}`}>
                {plan.items.length === 0 ? (
                  <Typography.Text type="secondary">暂无安排</Typography.Text>
                ) : (
                  <Timeline>
                    {plan.items.map((item) => (
                      <Timeline.Item key={item.id}>
                        <Space direction="vertical" size={4} style={{ width: '100%' }}>
                          <Space>
                            <Tag color={
                              item.type === 'spot' ? 'blue' :
                              item.type === 'food' ? 'orange' :
                              item.type === 'hotel' ? 'green' :
                              'purple'
                            }>
                              {item.type === 'spot' ? '景点' :
                               item.type === 'food' ? '餐饮' :
                               item.type === 'hotel' ? '住宿' :
                               '交通'}
                            </Tag>
                            <Typography.Text strong>{item.name}</Typography.Text>
                            {item.time_range && (
                              <Typography.Text type="secondary">({item.time_range})</Typography.Text>
                            )}
                            {item.cost_est && (
                              <Typography.Text type="secondary">¥{item.cost_est}</Typography.Text>
                            )}
                          </Space>
                          {item.address && (
                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                              地址：{item.address}
                            </Typography.Text>
                          )}
                          {item.notes && (
                            <Typography.Text style={{ fontSize: 12 }}>
                              {item.notes}
                            </Typography.Text>
                          )}
                        </Space>
                      </Timeline.Item>
                    ))}
                  </Timeline>
                )}
              </Card>
            ))}
          </Space>
        )}
      </Card>

      <Card title="费用记录">
        <Typography.Text type="secondary">
          费用记录功能开发中，敬请期待...
        </Typography.Text>
      </Card>
    </Space>
  );
}

