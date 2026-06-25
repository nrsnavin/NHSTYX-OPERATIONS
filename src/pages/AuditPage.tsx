import { useState } from 'react';
import { Card, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useAuditLog, type AuditEntry } from '../api/audit.api';

export function AuditPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAuditLog({ page, limit: 20 });

  const columns: ColumnsType<AuditEntry> = [
    {
      title: 'When',
      dataIndex: 'createdAt',
      key: 'when',
      render: (d: string) =>
        new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
    },
    { title: 'Action', dataIndex: 'action', key: 'action', render: (a: string) => <Tag>{a}</Tag> },
    {
      title: 'Entity',
      key: 'entity',
      render: (_, r) => (
        <>
          {r.entity}
          {r.entityId ? (
            <Typography.Text type="secondary"> · {r.entityId.slice(0, 8)}</Typography.Text>
          ) : null}
        </>
      ),
    },
    { title: 'By', key: 'by', render: (_, r) => r.actorName ?? r.actorType },
    {
      title: 'Details',
      key: 'meta',
      render: (_, r) => (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {r.meta && Object.keys(r.meta).length ? JSON.stringify(r.meta) : '—'}
        </Typography.Text>
      ),
    },
  ];

  return (
    <Card title="Audit trail">
      <Table<AuditEntry>
        rowKey="id"
        loading={isLoading}
        columns={columns}
        dataSource={data?.items ?? []}
        pagination={{
          current: page,
          pageSize: 20,
          total: data?.pagination.total ?? 0,
          onChange: setPage,
          showSizeChanger: false,
        }}
      />
    </Card>
  );
}
