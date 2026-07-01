import { Card, Col, Empty, Progress, Row, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useAgentPerformance, type AgentPerformanceRow } from '../api/agentsPerf.api';
import { formatPaise } from '../lib/money';

export function AgentPerformancePage() {
  const { data, isLoading } = useAgentPerformance();
  const agents = data?.agents ?? [];

  const totals = agents.reduce(
    (acc, a) => ({
      leadsWon: acc.leadsWon + a.leads.won,
      pipeline: acc.pipeline + a.leads.pipelinePaise,
      quotesConverted: acc.quotesConverted + a.quotations.converted,
      visits: acc.visits + a.visits,
    }),
    { leadsWon: 0, pipeline: 0, quotesConverted: 0, visits: 0 },
  );

  const columns: ColumnsType<AgentPerformanceRow> = [
    {
      title: 'Agent',
      key: 'agent',
      fixed: 'left',
      render: (_, a) => (
        <div>
          <div style={{ fontWeight: 600 }}>
            {a.name} {!a.isActive && <Tag>Inactive</Tag>}
          </div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {a.store ? `${a.store.name} · ${a.store.city}` : 'No store'}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'Leads (won / total)',
      key: 'leads',
      sorter: (a, b) => a.leads.won - b.leads.won,
      render: (_, a) => (
        <div style={{ minWidth: 130 }}>
          <span>
            <Typography.Text strong>{a.leads.won}</Typography.Text>
            <Typography.Text type="secondary"> / {a.leads.total}</Typography.Text>
            {a.leads.open > 0 && (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {' '}
                · {a.leads.open} open
              </Typography.Text>
            )}
          </span>
          {a.leads.won + a.leads.lost > 0 && (
            <Progress
              percent={a.leads.winRatePct}
              size="small"
              format={(p) => `${p}% win`}
              status={a.leads.winRatePct >= 50 ? 'success' : 'normal'}
            />
          )}
        </div>
      ),
    },
    {
      title: 'Pipeline',
      key: 'pipeline',
      sorter: (a, b) => a.leads.pipelinePaise - b.leads.pipelinePaise,
      render: (_, a) =>
        a.leads.pipelinePaise > 0 ? (
          formatPaise(a.leads.pipelinePaise)
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        ),
    },
    {
      title: 'Quotes (conv. / total)',
      key: 'quotes',
      sorter: (a, b) => a.quotations.converted - b.quotations.converted,
      render: (_, a) => (
        <div>
          <Typography.Text strong>{a.quotations.converted}</Typography.Text>
          <Typography.Text type="secondary"> / {a.quotations.total}</Typography.Text>
          {a.quotations.total > 0 && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {' '}
              · {a.quotations.conversionPct}%
            </Typography.Text>
          )}
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {formatPaise(a.quotations.valuePaise)} quoted
            </Typography.Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Field activity',
      key: 'activity',
      sorter: (a, b) => a.visits - b.visits,
      render: (_, a) => (
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          {a.visits} visits · {a.calls} calls · {a.activities} total
        </Typography.Text>
      ),
    },
    {
      title: 'Customers',
      dataIndex: 'customersManaged',
      key: 'customers',
      sorter: (a, b) => a.customersManaged - b.customersManaged,
    },
    {
      title: 'Store revenue (30d)',
      key: 'revenue',
      sorter: (a, b) => a.storeRevenuePaise - b.storeRevenuePaise,
      defaultSortOrder: 'descend',
      render: (_, a) => <Typography.Text strong>{formatPaise(a.storeRevenuePaise)}</Typography.Text>,
    },
  ];

  return (
    <Card
      title="Agent performance"
      extra={
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Store revenue is the last 30 days and shared across a store's agents.
        </Typography.Text>
      }
    >
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic title="Agents" value={agents.length} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic title="Leads won" value={totals.leadsWon} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic title="Quotes converted" value={totals.quotesConverted} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic title="Field visits" value={totals.visits} />
          </Card>
        </Col>
      </Row>
      <Table<AgentPerformanceRow>
        rowKey="id"
        loading={isLoading}
        columns={columns}
        dataSource={agents}
        scroll={{ x: 900 }}
        pagination={false}
        locale={{ emptyText: <Empty description="No agents yet" /> }}
      />
    </Card>
  );
}
