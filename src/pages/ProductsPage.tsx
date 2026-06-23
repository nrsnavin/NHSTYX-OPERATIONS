import { useState } from 'react';
import { Card, Input, Table, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useProducts } from '../api/products.api';
import { formatPaise } from '../lib/money';
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
      title: 'Price (excl. GST)',
      key: 'price',
      render: (_, record) => {
        const tiers = record.priceTiers ?? [];
        return (
          <div>
            <div style={{ fontWeight: 600 }}>{formatPaise(record.pricePaise)}</div>
            {tiers.length > 0 && (
              <Tooltip
                title={tiers
                  .map((t) => `${t.minQty}+ → ${formatPaise(t.pricePaise)}`)
                  .join('  ·  ')}
              >
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {tiers.length} tier{tiers.length > 1 ? 's' : ''}
                </Typography.Text>
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      title: 'GST',
      dataIndex: 'gstRatePercent',
      key: 'gst',
      render: (gst: number, record) => (
        <span>
          {gst}%{record.hsnCode ? <Typography.Text type="secondary"> · HSN {record.hsnCode}</Typography.Text> : null}
        </span>
      ),
    },
    {
      title: 'MOQ',
      dataIndex: 'moqQty',
      key: 'moq',
    },
    {
      title: 'Stock',
      dataIndex: 'stockQty',
      key: 'stock',
      render: (stock: number) =>
        stock > 0 ? stock : <Tag color="red">Out of stock</Tag>,
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
