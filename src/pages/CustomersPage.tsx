import { useState } from 'react';
import { Card, Input, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCustomers } from '../api/customers.api';
import { formatPaise } from '../lib/money';
import type { Customer } from '../types';

export function CustomersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { data, isLoading } = useCustomers({ page, limit: 10, search: search || undefined });

  const columns: ColumnsType<Customer> = [
    {
      title: 'Shop',
      dataIndex: 'shopName',
      key: 'shopName',
      render: (shopName: string, record) => (
        <div>
          <div style={{ fontWeight: 600 }}>{shopName}</div>
          <Typography.Text type="secondary">{record.ownerName ?? '—'}</Typography.Text>
        </div>
      ),
    },
    { title: 'Phone', dataIndex: 'phone', key: 'phone' },
    {
      title: 'GSTIN',
      dataIndex: 'gstin',
      key: 'gstin',
      render: (gstin?: string | null) => gstin ?? <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: 'Credit',
      key: 'credit',
      render: (_, record) =>
        record.creditLimitPaise > 0 ? (
          <span>
            {formatPaise(record.creditLimitPaise)}
            <Typography.Text type="secondary"> · {record.creditDays}d</Typography.Text>
          </span>
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        ),
    },
    {
      title: 'Orders',
      key: 'orders',
      render: (_, record) => record._count?.orders ?? 0,
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) =>
        isActive ? <Tag color="green">Active</Tag> : <Tag color="red">Disabled</Tag>,
    },
  ];

  return (
    <Card
      title="Customers"
      extra={
        <Input.Search
          placeholder="Search shop / phone…"
          allowClear
          onSearch={(value) => {
            setSearch(value);
            setPage(1);
          }}
          style={{ width: 260 }}
        />
      }
    >
      <Table<Customer>
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
