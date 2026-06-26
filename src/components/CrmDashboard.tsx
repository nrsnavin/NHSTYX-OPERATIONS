import { Card, Col, Empty, Progress, Row, Space, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCrmDashboard } from '../api/crm.api';
import { formatPaise } from '../lib/money';
import type { AgentLeaderRow, LeadStage } from '../types';

const STAGE_COLOR: Record<LeadStage, string> = {
  NEW: 'default',
  CONTACTED: 'blue',
  QUALIFIED: 'geekblue',
  WON: 'green',
  LOST: 'red',
};

export function CrmDashboard() {
  const { data, isLoading } = useCrmDashboard();

  if (isLoading) {
    return <Card loading style={{ minHeight: 240 }} />;
  }
  if (!data) {
    return <Empty description="No pipeline data yet" />;
  }

  const { pipeline, leaderboard, conversion, aging } = data;
  const maxStageValue = Math.max(...pipeline.map((p) => p.valuePaise), 1);
  const maxConv = Math.max(...conversion.flatMap((c) => [c.created, c.won]), 1);

  const leaderCols: ColumnsType<AgentLeaderRow> = [
    { title: 'Agent', dataIndex: 'name', key: 'name' },
    { title: 'Leads', dataIndex: 'total', key: 'total' },
    { title: 'Won', dataIndex: 'won', key: 'won' },
    {
      title: 'Win rate',
      key: 'rate',
      render: (_, r) => `${r.total ? Math.round((r.won / r.total) * 100) : 0}%`,
    },
    { title: 'Won value', key: 'val', render: (_, r) => formatPaise(r.wonValuePaise) },
  ];

  const agingCards: { label: string; value: number; color?: string }[] = [
    { label: 'Overdue', value: aging.overdue, color: '#cf1322' },
    { label: 'Due today', value: aging.today, color: '#d46b08' },
    { label: 'Next 7 days', value: aging.upcoming, color: '#1677ff' },
    { label: 'Later', value: aging.later },
    { label: 'No follow-up', value: aging.none, color: '#8c8c8c' },
  ];

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {/* Follow-up ageing */}
      <Row gutter={[12, 12]}>
        {agingCards.map((c) => (
          <Col xs={12} sm={8} lg={4} key={c.label} flex="1">
            <Card size="small">
              <Statistic title={c.label} value={c.value} valueStyle={c.color ? { color: c.color } : undefined} />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        {/* Pipeline value by stage */}
        <Col xs={24} lg={12}>
          <Card title="Pipeline value by stage" size="small">
            {pipeline.map((p) => (
              <div key={p.stage} style={{ marginBottom: 12 }}>
                <Row justify="space-between" style={{ marginBottom: 2 }}>
                  <Space size={6}>
                    <Tag color={STAGE_COLOR[p.stage]} style={{ margin: 0 }}>
                      {p.stage}
                    </Tag>
                    <Typography.Text type="secondary">{p.count} leads</Typography.Text>
                  </Space>
                  <Typography.Text strong>{formatPaise(p.valuePaise)}</Typography.Text>
                </Row>
                <Progress
                  percent={Math.round((p.valuePaise / maxStageValue) * 100)}
                  showInfo={false}
                  strokeColor={p.stage === 'WON' ? '#52c41a' : p.stage === 'LOST' ? '#ff4d4f' : '#1677ff'}
                />
              </div>
            ))}
          </Card>
        </Col>

        {/* Conversion over time */}
        <Col xs={24} lg={12}>
          <Card
            title="New vs won (6 months)"
            size="small"
            extra={
              <Space size={12}>
                <Space size={4}>
                  <span style={{ width: 10, height: 10, background: '#91caff', display: 'inline-block', borderRadius: 2 }} />
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    New
                  </Typography.Text>
                </Space>
                <Space size={4}>
                  <span style={{ width: 10, height: 10, background: '#52c41a', display: 'inline-block', borderRadius: 2 }} />
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    Won
                  </Typography.Text>
                </Space>
              </Space>
            }
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 150, paddingTop: 8 }}>
              {conversion.map((m) => (
                <div key={m.month} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ height: 110, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 3 }}>
                    <div
                      title={`New: ${m.created}`}
                      style={{ width: 12, height: `${(m.created / maxConv) * 100}%`, background: '#91caff', borderRadius: '2px 2px 0 0' }}
                    />
                    <div
                      title={`Won: ${m.won}`}
                      style={{ width: 12, height: `${(m.won / maxConv) * 100}%`, background: '#52c41a', borderRadius: '2px 2px 0 0' }}
                    />
                  </div>
                  <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                    {m.month.slice(5)}
                  </Typography.Text>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Agent leaderboard */}
      <Card title="Agent leaderboard" size="small">
        <Table<AgentLeaderRow>
          rowKey="agentId"
          size="small"
          columns={leaderCols}
          dataSource={leaderboard}
          pagination={false}
          locale={{ emptyText: 'No assigned leads yet' }}
        />
      </Card>
    </Space>
  );
}
