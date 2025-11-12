"use client";
import { useEffect, useState } from 'react';
import { List, Card, Typography, Empty, Button, Spin, message, Popconfirm } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { supabase } from '../../lib/supabase/client';

// 标记为动态渲染，避免构建时预渲染
export const dynamic = 'force-dynamic';

interface Trip {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  budget: number | null;
}

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('trips')
        .select('id, title, destination, start_date, end_date, budget')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrips(data || []);
    } catch (err: any) {
      console.error('加载行程失败:', err);
      message.error('加载行程失败: ' + (err.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (tripId: string, tripTitle: string) => {
    try {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripId);

      if (error) throw error;

      message.success(`行程"${tripTitle}"已删除`);
      loadTrips(); // 重新加载列表
    } catch (err: any) {
      console.error('删除行程失败:', err);
      message.error('删除行程失败: ' + (err.message || '未知错误'));
    }
  };

  if (loading) {
    return <Spin size="large" style={{ display: 'block', textAlign: 'center', marginTop: 50 }} />;
  }

  return (
    <div>
      <Typography.Title level={3}>我的行程</Typography.Title>
      {trips.length === 0 ? (
        <Empty description="暂无行程">
          <Button type="primary"><Link href="/new">新建行程</Link></Button>
        </Empty>
      ) : (
        <List grid={{ gutter: 16, column: 3 }} dataSource={trips} renderItem={(trip) => (
          <List.Item>
            <Card 
              title={trip.title} 
              extra={trip.destination}
              actions={[
                <Link key="view" href={`/trips/${trip.id}`}>查看详情</Link>,
                <Popconfirm
                  key="delete"
                  title="确定要删除这个行程吗？"
                  description="删除后将无法恢复，包括所有相关的行程计划和费用记录。"
                  onConfirm={() => handleDelete(trip.id, trip.title)}
                  okText="确定"
                  cancelText="取消"
                  okType="danger"
                >
                  <Button 
                    type="text" 
                    danger 
                    icon={<DeleteOutlined />}
                    onClick={(e) => e.stopPropagation()}
                  >
                    删除
                  </Button>
                </Popconfirm>
              ]}
            >
              <Typography.Text type="secondary">
                {trip.start_date} 至 {trip.end_date}
              </Typography.Text>
              {trip.budget && (
                <div>
                  <Typography.Text>预算: ¥{trip.budget}</Typography.Text>
                </div>
              )}
            </Card>
          </List.Item>
        )} />
      )}
    </div>
  );
}




