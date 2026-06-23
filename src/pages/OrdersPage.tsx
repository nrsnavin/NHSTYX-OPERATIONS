import { useState } from 'react';
import { Card, Select, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useOrders, useUpdateOrderStatus } from '../api/orders.api';
import { formatPaise } from '../lib/money';
import type { Order, OrderPaymentStatus, OrderStatus } from '../types';

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: 'gold',
  CONFIRMED: 'blue',
  PACKED: 'geekblue',
  SHIPPED: 'purple',
  DELIVERED: 'green',
  CANCELLED: 'red',
  RETURNED: 'volcano',
};

const STATUS_OPTIONS: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PACKED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
];

const PAYMENT_COLORS: Record<OrderPaymentStatus, string> = {
  UNPAID: 'red',
  PARTIALLY_PAID: 'orange',
  PAID: 'green',
  REFUNDED: 'default',
};

export function OrdersPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useOrders({ page, limit: 10 });
  const updateStatus = useUpdateOrderStatus();

  const columns: ColumnsType<Order> = [
    {
      title: 'Order #',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      render: (value: string) => <Typography.Text strong>{value}</Typography.Text>,
    },
    {
      title: 'Customer',
      key: 'customer',
      render: (_, record) =>
        record.customer ? (
          <div>
            <div>{record.customer.shopName}</div>
            <Typography.Text type="secondary">{record.customer.phone}</Typography.Text>
          </div>
        ) : (
          '—'
        ),
    },
    {
      title: 'Store',
      key: 'store',
      render: (_, record) =>
        record.store ? <Tag color="blue">{record.store.city}</Tag> : <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: 'Items',
      key: 'items',
      render: (_, record) => record.items?.length ?? 0,
    },
    {
      title: 'Total',
      dataIndex: 'totalPaise',
      key: 'total',
      render: (totalPaise: number) => formatPaise(totalPaise),
    },
    {
      title: 'Payment',
      key: 'payment',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Tag color={PAYMENT_COLORS[record.paymentStatus]}>{record.paymentStatus}</Tag>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {record.paymentMethod}
            {record.amountDuePaise > 0 ? ` · due ${formatPaise(record.amountDuePaise)}` : ''}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Placed',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('DD MMM YYYY'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: OrderStatus, record) => (
        <Select<OrderStatus>
          size="small"
          value={status}
          style={{ width: 140 }}
          loading={updateStatus.isPending}
          onChange={(next) => updateStatus.mutate({ id: record.id, status: next })}
          options={STATUS_OPTIONS.map((s) => ({
            value: s,
            label: <Tag color={STATUS_COLORS[s]}>{s}</Tag>,
          }))}
        />
      ),
    },
  ];

  return (
    <Card title="Orders">
      <Table<Order>
        rowKey="id"
        loading={isLoading}
        columns={columns}
        dataSource={data?.items ?? []}
        pagination={{
          current: page,
          pageSize: 10,
          total: data?.pagination.total ?? 0,
          onChange: setPage,
          showSizeChanger: false,
        }}
      />
    </Card>
  );
}
