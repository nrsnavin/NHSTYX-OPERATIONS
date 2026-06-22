import { useState } from 'react';
import { Card, Input, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
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
          <Typography.Text type="secondary">{record.brand ?? '—'}</Typography.Text>
        </div>
      ),
    },
    {
      title: 'Category',
      key: 'category',
      render: (_, record) => record.category?.name ?? '—',
    },
    {
      title: 'Variants',
      key: 'variants',
      render: (_, record) => record.variants.length,
    },
    {
      title: 'From price',
      key: 'price',
      render: (_, record) => {
        const prices = record.variants.map((v) => Number(v.price));
        const min = prices.length ? Math.min(...prices) : 0;
        return `₹${min.toFixed(2)}`;
      },
    },
    {
      title: 'In stock',
      key: 'stock',
      render: (_, record) =>
        record.variants.reduce((sum, v) => sum + v.stockQuantity, 0),
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
      title="Products"
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
