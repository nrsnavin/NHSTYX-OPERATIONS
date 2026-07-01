import { useMemo, useState } from 'react';
import { Card, Empty, List, Segmented, Space, Tag, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useStaffNotifications } from '../api/notifications.api';
import type { AppNotification } from '../types';

const EVENT_COLORS: Record<string, string> = {
  ORDER_PLACED: 'blue',
  PAYMENT_RECEIVED: 'green',
  ORDER_SHIPPED: 'purple',
  ORDER_DELIVERED: 'green',
  ORDER_CANCELLED: 'red',
  RETURN_REQUESTED: 'gold',
  RETURN_REFUNDED: 'volcano',
};

const eventLabel = (e: string) =>
  e.charAt(0) + e.slice(1).toLowerCase().replaceAll('_', ' ');

export function NotificationsPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useStaffNotifications();
  const [filter, setFilter] = useState<string>('ALL');

  const events = useMemo(() => {
    const set = new Set((data ?? []).map((n) => n.event));
    return ['ALL', ...Array.from(set)];
  }, [data]);

  const items = (data ?? []).filter((n) => filter === 'ALL' || n.event === filter);

  return (
    <Card
      title="Notifications"
      extra={
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Store activity — new orders, payments, shipments and returns
        </Typography.Text>
      }
    >
      <Space style={{ marginBottom: 16, overflowX: 'auto', maxWidth: '100%' }}>
        <Segmented
          value={filter}
          onChange={(v) => setFilter(v as string)}
          options={events.map((e) => ({ label: e === 'ALL' ? 'All' : eventLabel(e), value: e }))}
        />
      </Space>
      <List<AppNotification>
        loading={isLoading}
        locale={{ emptyText: <Empty description="No notifications yet" /> }}
        dataSource={items}
        renderItem={(n) => (
          <List.Item
            style={{ cursor: n.orderId ? 'pointer' : 'default' }}
            onClick={() => n.orderId && navigate(`/orders?order=${n.orderId}`)}
          >
            <List.Item.Meta
              title={
                <Space>
                  <Tag color={EVENT_COLORS[n.event] ?? 'default'}>{eventLabel(n.event)}</Tag>
                  <span>{n.title}</span>
                </Space>
              }
              description={n.body}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
              {dayjs(n.createdAt).format('DD MMM, h:mm a')}
            </Typography.Text>
          </List.Item>
        )}
      />
    </Card>
  );
}
