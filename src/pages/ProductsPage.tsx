import { useState } from 'react';
import { Alert, Card, Input, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';
import { useProducts } from '../api/products.api';
import type { Product } from '../types';

export function ProductsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { data, isLoading } = useProducts({ page, limit: 10, search: search || undefined });

  const columns: ColumnsType<Product> = [
    {
      title: 'Product',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <div>
          <div style={{ fontWeight: 600 }}>{name}</div>
          <Typography.Text type="secondary">
            {record.brand ?? '—'} · {record.category?.name ?? '—'}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'Unit',
      dataIndex: 'unit',
      key: 'unit',
      render: (unit: string) => <Tag>{unit}</Tag>,
    },
    {
      title: 'GST',
      dataIndex: 'gstRatePercent',
      key: 'gst',
      render: (gst: number, record) => (
        <span>
          {gst}%
          {record.hsnCode ? (
            <Typography.Text type="secondary"> · HSN {record.hsnCode}</Typography.Text>
          ) : null}
        </span>
      ),
    },
    {
      title: 'MOQ',
      dataIndex: 'moqQty',
      key: 'moq',
    },
    {
      title: 'Stocked in',
      key: 'stores',
      render: (_, record) => {
        const n = record._count?.storeProducts ?? 0;
        return n > 0 ? (
          <Tag color="blue">{n} store{n > 1 ? 's' : ''}</Tag>
        ) : (
          <Tag>Not stocked</Tag>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) =>
        isActive ? <Tag color="green">Active</Tag> : <Tag>Inactive</Tag>,
    },
  ];

  return (
    <Card
      title="Catalog"
      extra={
        <Input.Search
          placeholder="Search products…"
          allowClear
          onSearch={(value) => {
            setSearch(value);
            setPage(1);
          }}
          style={{ width: 260 }}
        />
      }
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Price and stock are managed per store."
        description={<>Set a product's price, stock and quantity tiers for each store under <Link to="/stores">Stores → Manage → Inventory</Link>.</>}
      />
      <Table<Product>
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
