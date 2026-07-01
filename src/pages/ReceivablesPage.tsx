import { Card, Col, Progress, Row, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useReceivables, type ReceivableRow } from '../api/receivables.api';
import { formatPaise } from '../lib/money';
import { StatusPill } from '../components/StatusPill';

export function ReceivablesPage() {
  const { data, isLoading } = useReceivables();
  const s = data?.summary;

  const columns: ColumnsType<ReceivableRow> = [
    {
      title: 'Shop',
      key: 'shop',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.shopName}</div>
          <Typography.Text type="secondary">{r.phone}</Typography.Text>
        </div>
      ),
    },
    {
      title: 'Outstanding',
      key: 'outstanding',
      sorter: (a, b) => a.outstandingPaise - b.outstandingPaise,
      defaultSortOrder: 'descend',
      render: (_, r) => <Typography.Text strong>{formatPaise(r.outstandingPaise)}</Typography.Text>,
    },
    {
      title: 'Overdue',
      key: 'overdue',
      sorter: (a, b) => a.overduePaise - b.overduePaise,
      render: (_, r) =>
        r.overduePaise > 0 ? (
          <Typography.Text type="danger">{formatPaise(r.overduePaise)}</Typography.Text>
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        ),
    },
    {
      title: 'Overdue since',
      key: 'since',
      render: (_, r) => {
        if (!r.oldestDueDate) return '—';
        const days = dayjs().diff(dayjs(r.oldestDueDate), 'day');
        return (
          <Typography.Text type="secondary">
            {dayjs(r.oldestDueDate).format('DD MMM yyyy')}
            {days > 0 ? ` · ${days}d` : ''}
          </Typography.Text>
        );
      },
    },
    {
      title: 'Credit limit',
      key: 'limit',
      render: (_, r) =>
        r.creditLimitPaise > 0 ? formatPaise(r.creditLimitPaise) : <Tag>No credit</Tag>,
    },
    {
      title: 'Utilisation',
      key: 'util',
      render: (_, r) =>
        r.utilizationPct == null ? (
          <Typography.Text type="secondary">—</Typography.Text>
        ) : (
          <div style={{ minWidth: 120 }}>
            <Progress
              percent={Math.min(r.utilizationPct, 100)}
              size="small"
              status={r.overLimit ? 'exception' : r.utilizationPct >= 80 ? 'active' : 'normal'}
              format={() => `${r.utilizationPct}%`}
            />
            {r.overLimit && <StatusPill color="red">Over limit</StatusPill>}
          </div>
        ),
    },
  ];

  return (
    <Card title="Receivables">
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              title="Total outstanding"
              value={((s?.totalOutstandingPaise ?? 0) / 100).toLocaleString('en-IN')}
              prefix="₹"
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              title="Overdue"
              valueStyle={{ color: '#cf1322' }}
              value={((s?.totalOverduePaise ?? 0) / 100).toLocaleString('en-IN')}
              prefix="₹"
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic title="Customers with dues" value={s?.customersWithDues ?? 0} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              title="Over credit limit"
              valueStyle={{ color: (s?.overLimitCount ?? 0) > 0 ? '#cf1322' : undefined }}
              value={s?.overLimitCount ?? 0}
            />
          </Card>
        </Col>
      </Row>
      <Table
        rowKey="customerId"
        loading={isLoading}
        columns={columns}
        dataSource={data?.customers ?? []}
        pagination={{ pageSize: 12 }}
      />
    </Card>
  );
}
