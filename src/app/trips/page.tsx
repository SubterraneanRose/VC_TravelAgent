"use client";
import { List, Card, Typography, Empty, Button } from 'antd';
import Link from 'next/link';

export default function TripsPage() {
  const trips: Array<{ id: string; title: string; destination: string }> = [];
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
            <Card title={trip.title} extra={trip.destination}>
              <Link href={`/trips/${trip.id}`}>查看详情</Link>
            </Card>
          </List.Item>
        )} />
      )}
    </div>
  );
}



