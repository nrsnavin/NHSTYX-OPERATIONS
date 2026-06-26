import type { ReactNode } from 'react';
import { Card, Col, Row, Table, Tag, Typography } from 'antd';
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

const LEAD_STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'WON', 'LOST'] as const;
const STAGE_DOT: Record<string, string> = {
  NEW: '#9aa1ad',
  CONTACTED: '#1677ff',
  QUALIFIED: '#722ed1',
  WON: '#16a34a',
  LOST: '#ef4444',
};

function StatCard({
  title,
  value,
  sub,
  icon,
  bg,
  fg,
  to,
  loading,
  valueColor,
}: {
  title: string;
  value: ReactNode;
  sub?: ReactNode;
  icon: ReactNode;
  bg: string;
  fg: string;
  to?: string;
  loading?: boolean;
  valueColor?: string;
}) {
  const inner = (
    <Card hoverable={Boolean(to)} loading={loading} styles={{ body: { padding: 18 } }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: '#6b7280', fontSize: 13, fontWeight: 500 }}>{title}</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6, lineHeight: 1.1, color: valueColor }}>
            {value}
          </div>
          {sub && <div style={{ color: '#9aa1ad', fontSize: 12, marginTop: 6 }}>{sub}</div>}
        </div>
        <div
          style={{
            width: 46,
            height: 46,
            flexShrink: 0,
            borderRadius: 12,
            background: bg,
            color: fg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
          }}
        >
          {icon}
        </div>
      </div>
    </Card>
  );
  return to ? (
    <Link to={to} style={{ display: 'block' }}>
      {inner}
    </Link>
  ) : (
    inner
  );
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useDashboard();
  const lowStock = useLowStock();

  const awaiting = data?.ordersByStatus?.PENDING ?? 0;
  const creditOutstanding = data?.creditOutstandingPaise ?? 0;
  const pending = data?.pendingApprovals ?? 0;
  const maxStage = Math.max(1, ...LEAD_STAGES.map((s) => data?.leadsByStage?.[s] ?? 0));

  const lowCols: ColumnsType<LowStockItem> = [
    {
      title: 'Product',
      dataIndex: 'name',
      key: 'name',
      render: (n: string) => <Typography.Text strong>{n}</Typography.Text>,
    },
    { title: 'Store', key: 'store', render: (_, r) => <Tag color="blue">{r.storeCity}</Tag> },
    {
      title: 'Stock',
      dataIndex: 'stockQty',
      key: 'stock',
      render: (q: number, r) => (
        <Tag color={q === 0 ? 'red' : 'orange'} style={{ fontWeight: 600 }}>
          {q} {r.unit.toLowerCase()}
        </Tag>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3} style={{ marginBottom: 2 }}>
        Welcome back, {user?.name ?? 'there'} 👋
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 20 }}>
        Here's the snapshot{user?.role === 'AGENT' ? ' for your store' : ' across all stores'}.
      </Typography.Paragraph>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Sales this month"
            value={formatPaise(data?.sales.thisMonthPaise ?? 0)}
            sub={`${data?.sales.thisMonthOrders ?? 0} orders · ${formatPaise(data?.sales.totalPaise ?? 0)} all-time`}
            icon={<RiseOutlined />}
            bg="#e7f7ee"
            fg="#16a34a"
            loading={isLoading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Credit outstanding"
            value={formatPaise(creditOutstanding)}
            valueColor={creditOutstanding > 0 ? '#cf1322' : undefined}
            sub="Unpaid pay-later orders"
            icon={<CreditCardOutlined />}
            bg="#fdecec"
            fg="#cf1322"
            loading={isLoading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Orders to action"
            value={awaiting}
            sub={`${data?.sales.orderCount ?? 0} total orders`}
            icon={<ClockCircleOutlined />}
            bg="#e8f1ff"
            fg="#1677ff"
            to="/orders"
            loading={isLoading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Pending approvals"
            value={pending}
            valueColor={pending > 0 ? '#d46b08' : undefined}
            sub={`${data?.customers ?? 0} customers`}
            icon={<TeamOutlined />}
            bg="#fff1e9"
            fg="#f2530a"
            to="/customers"
            loading={isLoading}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={14}>
          <Card
            title={
              <span>
                <WarningOutlined style={{ color: '#d4380d', marginRight: 8 }} />
                Low stock ({data?.lowStockCount ?? 0})
              </span>
            }
            extra={<Link to="/purchasing">Reorder</Link>}
          >
            <Table<LowStockItem>
              rowKey={(r) => `${r.storeId}-${r.productId}`}
              size="middle"
              loading={lowStock.isLoading}
              columns={lowCols}
              dataSource={lowStock.data ?? []}
              pagination={{ pageSize: 6, showSizeChanger: false }}
              locale={{ emptyText: 'All stocked up 🎉' }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="Leads pipeline" extra={<Link to="/leads">Open</Link>}>
            {LEAD_STAGES.map((s) => {
              const count = data?.leadsByStage?.[s] ?? 0;
              return (
                <div key={s} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 999,
                          background: STAGE_DOT[s],
                          display: 'inline-block',
                        }}
                      />
                      <Typography.Text style={{ fontSize: 13 }}>{s}</Typography.Text>
                    </span>
                    <Typography.Text strong>{count}</Typography.Text>
                  </div>
                  <div style={{ height: 6, borderRadius: 999, background: '#f1f2f4', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${(count / maxStage) * 100}%`,
                        background: STAGE_DOT[s],
                        borderRadius: 999,
                        transition: 'width 0.3s',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
