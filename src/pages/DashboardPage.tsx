import { Card, Col, Row, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ClockCircleOutlined,
  CreditCardOutlined,
  RiseOutlined,
  TeamOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useDashboard, useLowStock, type LowStockItem } from '../api/stats.api';
import { formatPaise } from '../lib/money';
import { useAuthStore } from '../store/auth.store';

const LEAD_STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'WON', 'LOST'];

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useDashboard();
  const lowStock = useLowStock();

  const awaiting =
    (data?.ordersByStatus?.PENDING ?? 0);

  const lowCols: ColumnsType<LowStockItem> = [
    { title: 'Product', dataIndex: 'name', key: 'name' },
    { title: 'Store', key: 'store', render: (_, r) => <Tag color="blue">{r.storeCity}</Tag> },
    {
      title: 'Stock',
      dataIndex: 'stockQty',
      key: 'stock',
      render: (q: number, r) => (
        <Tag color={q === 0 ? 'red' : 'orange'}>
          {q} {r.unit.toLowerCase()}
        </Tag>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3}>Welcome back, {user?.name ?? 'there'} 👋</Typography.Title>
      <Typography.Paragraph type="secondary">
        Snapshot{user?.role === 'AGENT' ? ' for your store' : ' across all stores'}.
      </Typography.Paragraph>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Sales this month"
              value={(data?.sales.thisMonthPaise ?? 0) / 100}
              precision={2}
              prefix="₹"
              loading={isLoading}
            />
            <Typography.Text type="secondary">
              <RiseOutlined /> {data?.sales.thisMonthOrders ?? 0} orders · {formatPaise(data?.sales.totalPaise ?? 0)} all-time
            </Typography.Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Credit outstanding"
              value={(data?.creditOutstandingPaise ?? 0) / 100}
              precision={2}
              prefix="₹"
              valueStyle={{ color: (data?.creditOutstandingPaise ?? 0) > 0 ? '#cf1322' : undefined }}
              loading={isLoading}
            />
            <Typography.Text type="secondary">
              <CreditCardOutlined /> unpaid pay-later orders
            </Typography.Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Link to="/orders">
            <Card hoverable>
              <Statistic
                title="Orders to action"
                value={awaiting}
                prefix={<ClockCircleOutlined />}
                loading={isLoading}
              />
              <Typography.Text type="secondary">{data?.sales.orderCount ?? 0} total orders</Typography.Text>
            </Card>
          </Link>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Link to="/customers">
            <Card hoverable>
              <Statistic
                title="Pending approvals"
                value={data?.pendingApprovals ?? 0}
                prefix={<TeamOutlined />}
                valueStyle={{ color: (data?.pendingApprovals ?? 0) > 0 ? '#d46b08' : undefined }}
                loading={isLoading}
              />
              <Typography.Text type="secondary">{data?.customers ?? 0} customers</Typography.Text>
            </Card>
          </Link>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={14}>
          <Card
            title={
              <span>
                <WarningOutlined style={{ color: '#d4380d' }} /> Low stock ({data?.lowStockCount ?? 0})
              </span>
            }
            size="small"
          >
            <Table<LowStockItem>
              rowKey={(r) => `${r.storeId}-${r.productId}`}
              size="small"
              loading={lowStock.isLoading}
              columns={lowCols}
              dataSource={lowStock.data ?? []}
              pagination={{ pageSize: 6, showSizeChanger: false }}
              locale={{ emptyText: 'All stocked up 🎉' }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="Leads pipeline" size="small" extra={<Link to="/leads">Open</Link>}>
            {LEAD_STAGES.map((s) => (
              <Row key={s} justify="space-between" style={{ padding: '6px 0' }}>
                <Typography.Text>{s}</Typography.Text>
                <Typography.Text strong>{data?.leadsByStage?.[s] ?? 0}</Typography.Text>
              </Row>
            ))}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
