import { Card, Popconfirm, Space, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useRefundReturn, useRejectReturn, useReturns } from '../api/returns.api';
import { formatPaise } from '../lib/money';
import { StatusPill } from '../components/StatusPill';
import type { OrderReturn, ReturnStatus } from '../types';

const RETURN_COLORS: Record<ReturnStatus, string> = {
  REQUESTED: 'gold',
  APPROVED: 'blue',
  REJECTED: 'red',
  REFUNDED: 'green',
  CANCELLED: 'default',
};

export function ReturnsPage() {
  const { data: returns, isLoading } = useReturns();
  const refund = useRefundReturn();
  const reject = useRejectReturn();

  const doRefund = async (r: OrderReturn) => {
    try {
      await refund.mutateAsync(r.id);
      message.success(`Refunded ${r.returnNumber}`);
    } catch (e) {
      message.error((e as Error).message ?? 'Refund failed');
    }
  };

  const doReject = async (r: OrderReturn) => {
    try {
      await reject.mutateAsync({ id: r.id });
      message.success(`Rejected ${r.returnNumber}`);
    } catch (e) {
      message.error((e as Error).message ?? 'Failed');
    }
  };

  const columns: ColumnsType<OrderReturn> = [
    {
      title: 'Return #',
      dataIndex: 'returnNumber',
      key: 'returnNumber',
      render: (v: string) => <Typography.Text strong>{v}</Typography.Text>,
    },
    {
      title: 'Order',
      key: 'order',
      render: (_, r) => r.order?.orderNumber ?? '—',
    },
    {
      title: 'Shop',
      key: 'shop',
      render: (_, r) =>
        r.customer ? (
          <div>
            <div>{r.customer.shopName}</div>
            <Typography.Text type="secondary">{r.customer.phone}</Typography.Text>
          </div>
        ) : (
          '—'
        ),
    },
    {
      title: 'Items',
      key: 'items',
      render: (_, r) => r.items.reduce((n, i) => n + i.quantity, 0),
    },
    {
      title: 'Refund',
      key: 'refund',
      render: (_, r) => <Typography.Text strong>{formatPaise(r.refundAmountPaise)}</Typography.Text>,
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, r) => <StatusPill color={RETURN_COLORS[r.status]}>{r.status}</StatusPill>,
    },
    {
      title: 'Raised',
      key: 'createdAt',
      render: (_, r) => (
        <Typography.Text type="secondary">{dayjs(r.createdAt).format('DD MMM, h:mm a')}</Typography.Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, r) => {
        if (r.status !== 'REQUESTED' && r.status !== 'APPROVED') {
          return r.refundReference ? (
            <Typography.Text type="secondary">Ref: {r.refundReference}</Typography.Text>
          ) : (
            <Typography.Text type="secondary">—</Typography.Text>
          );
        }
        return (
          <Space>
            <Popconfirm
              title="Process this refund?"
              description="Restocks the items and refunds the customer."
              okText="Refund"
              onConfirm={() => doRefund(r)}
            >
              <Typography.Link>Refund</Typography.Link>
            </Popconfirm>
            <Popconfirm title="Reject this return?" okText="Reject" okButtonProps={{ danger: true }} onConfirm={() => doReject(r)}>
              <Typography.Link type="danger">Reject</Typography.Link>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <Card title="Returns & refunds">
      <Table
        rowKey="id"
        loading={isLoading}
        columns={columns}
        dataSource={returns ?? []}
        pagination={{ pageSize: 12 }}
        expandable={{
          expandedRowRender: (r) => (
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              {r.reason && (
                <Typography.Text type="secondary">Reason: {r.reason}</Typography.Text>
              )}
              {r.items.map((it) => (
                <Space key={it.id} style={{ justifyContent: 'space-between', width: 360 }}>
                  <span>
                    {it.orderItem?.productName ?? 'Item'}
                    {it.orderItem?.variantName ? ` · ${it.orderItem.variantName}` : ''} × {it.quantity}
                  </span>
                  <span>{formatPaise(it.lineRefundPaise)}</span>
                </Space>
              ))}
              {r.refundMethod && (
                <Tag color={RETURN_COLORS[r.status]}>
                  {r.status === 'REFUNDED' ? `Refunded via ${r.refundMethod}` : r.refundMethod}
                </Tag>
              )}
            </Space>
          ),
        }}
      />
    </Card>
  );
}
