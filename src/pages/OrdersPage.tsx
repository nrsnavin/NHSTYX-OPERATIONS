import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Drawer,
  Divider,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  openInvoice,
  useOrder,
  useOrders,
  useRecordPayment,
  useUpdateOrderStatus,
} from '../api/orders.api';
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
  const [selected, setSelected] = useState<string | null>(null);
  const { data, isLoading } = useOrders({ page, limit: 10 });
  const updateStatus = useUpdateOrderStatus();

  const columns: ColumnsType<Order> = [
    {
      title: 'Order #',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      render: (value: string, record) => (
        <Button type="link" style={{ padding: 0 }} onClick={() => setSelected(record.id)}>
          <Typography.Text strong>{value}</Typography.Text>
        </Button>
      ),
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
      render: (date: string) => dayjs(date).format('DD MMM'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: OrderStatus, record) => (
        <Select<OrderStatus>
          size="small"
          value={status}
          style={{ width: 130 }}
          loading={updateStatus.isPending}
          onChange={(next) => updateStatus.mutate({ id: record.id, status: next })}
          options={STATUS_OPTIONS.map((s) => ({
            value: s,
            label: <Tag color={STATUS_COLORS[s]}>{s}</Tag>,
          }))}
        />
      ),
    },
    {
      title: '',
      key: 'actions',
      render: (_, record) => (
        <Space size={4}>
          {record.status === 'PENDING' && (
            <Button size="small" type="primary" ghost onClick={() => setSelected(record.id)}>
              Verify
            </Button>
          )}
          <Button
            size="small"
            type="link"
            onClick={() =>
              openInvoice(record.id).catch((e) => message.error((e as Error).message ?? 'Failed'))
            }
          >
            Invoice
          </Button>
        </Space>
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
      <OrderDrawer id={selected} onClose={() => setSelected(null)} />
    </Card>
  );
}

function OrderDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: order, isLoading } = useOrder(id);
  const updateStatus = useUpdateOrderStatus();
  const recordPayment = useRecordPayment();

  const confirmBankPayment = async () => {
    if (!order) return;
    const ref = order.payments?.find((p) => p.method === 'BANK_TRANSFER')?.reference ?? undefined;
    try {
      await recordPayment.mutateAsync({
        id: order.id,
        method: 'BANK_TRANSFER',
        amountPaise: order.amountDuePaise || order.totalPaise,
        reference: ref,
      });
      message.success('Payment verified — order confirmed');
    } catch (e) {
      message.error((e as Error).message ?? 'Failed');
    }
  };

  const confirmCredit = async () => {
    if (!order) return;
    try {
      await updateStatus.mutateAsync({ id: order.id, status: 'CONFIRMED' });
      message.success('Credit order confirmed');
    } catch (e) {
      message.error((e as Error).message ?? 'Failed');
    }
  };

  const bankPayment = order?.payments?.find((p) => p.method === 'BANK_TRANSFER');
  const isPendingVerify = order?.status === 'PENDING';

  return (
    <Drawer
      title={order ? `Order ${order.orderNumber}` : 'Order'}
      width={560}
      open={Boolean(id)}
      onClose={onClose}
      loading={isLoading}
      extra={
        order ? (
          <Button
            onClick={() =>
              openInvoice(order.id).catch((e) => message.error((e as Error).message ?? 'Failed'))
            }
          >
            Invoice (PDF)
          </Button>
        ) : null
      }
    >
      {order && (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {isPendingVerify && order.paymentMethod === 'BANK_TRANSFER' && (
            <Alert
              type="warning"
              showIcon
              message="Verify the bank transfer before processing"
              description={
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <span>
                    Customer reference (UTR):{' '}
                    <Typography.Text strong copyable>
                      {bankPayment?.reference ?? '—'}
                    </Typography.Text>
                  </span>
                  <span>Amount: {formatPaise(order.amountDuePaise || order.totalPaise)}</span>
                  <Popconfirm
                    title="Confirm you've received this transfer?"
                    onConfirm={confirmBankPayment}
                    okText="Mark received"
                  >
                    <Button type="primary" loading={recordPayment.isPending}>
                      Mark payment received & confirm
                    </Button>
                  </Popconfirm>
                </Space>
              }
            />
          )}
          {isPendingVerify && order.paymentMethod === 'CREDIT' && (
            <Alert
              type="info"
              showIcon
              message="Credit order awaiting confirmation"
              description={
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <span>Pay-later order on the shop's approved credit. Confirm to process.</span>
                  <Button type="primary" onClick={confirmCredit} loading={updateStatus.isPending}>
                    Confirm credit order
                  </Button>
                </Space>
              }
            />
          )}

          <Descriptions size="small" column={1} bordered>
            <Descriptions.Item label="Shop">{order.customer?.shopName}</Descriptions.Item>
            <Descriptions.Item label="Phone">{order.customer?.phone}</Descriptions.Item>
            {order.store && <Descriptions.Item label="Store">{order.store.name}</Descriptions.Item>}
            <Descriptions.Item label="Status">
              <Tag color={STATUS_COLORS[order.status]}>{order.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Payment">
              {order.paymentMethod} · <Tag color={PAYMENT_COLORS[order.paymentStatus]}>{order.paymentStatus}</Tag>
            </Descriptions.Item>
          </Descriptions>

          <Divider style={{ margin: '4px 0' }}>Items</Divider>
          {order.items.map((it) => (
            <Space key={it.id} style={{ justifyContent: 'space-between', width: '100%' }}>
              <span>
                {it.productName} × {it.quantity}
              </span>
              <span>{formatPaise(it.lineTotalPaise)}</span>
            </Space>
          ))}

          <Divider style={{ margin: '4px 0' }} />
          <Descriptions size="small" column={1}>
            <Descriptions.Item label="Subtotal">{formatPaise(order.subtotalPaise)}</Descriptions.Item>
            <Descriptions.Item label="CGST">{formatPaise(order.cgstPaise)}</Descriptions.Item>
            <Descriptions.Item label="SGST">{formatPaise(order.sgstPaise)}</Descriptions.Item>
            <Descriptions.Item label="IGST">{formatPaise(order.igstPaise)}</Descriptions.Item>
            <Descriptions.Item label="Total">
              <Typography.Text strong>{formatPaise(order.totalPaise)}</Typography.Text>
            </Descriptions.Item>
          </Descriptions>
        </Space>
      )}
    </Drawer>
  );
}
