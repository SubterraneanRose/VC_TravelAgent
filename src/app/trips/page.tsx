"use client";
import { useEffect, useState } from 'react';
import { List, Card, Typography, Empty, Button, Spin, message } from 'antd';
import Link from 'next/link';
import { supabase } from '../../lib/supabase/client';

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
              actions={[<Link key="view" href={`/trips/${trip.id}`}>查看详情</Link>]}
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




