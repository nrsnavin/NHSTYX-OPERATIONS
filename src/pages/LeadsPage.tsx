import { useState } from 'react';
import {
  Button,
  Card,
  DatePicker,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  Space,
  Table,
  Tag,
  Timeline,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useQueryClient } from '@tanstack/react-query';
import {
  addActivity,
  convertLead,
  createLead,
  updateLead,
  useLead,
  useLeads,
} from '../api/crm.api';
import { formatPaise } from '../lib/money';
import type { ActivityType, Lead, LeadStage } from '../types';

const STAGES: LeadStage[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'WON', 'LOST'];
const STAGE_COLOR: Record<LeadStage, string> = {
  NEW: 'default',
  CONTACTED: 'blue',
  QUALIFIED: 'geekblue',
  WON: 'green',
  LOST: 'red',
};
const ACTIVITY_TYPES: ActivityType[] = ['NOTE', 'CALL', 'VISIT', 'EMAIL'];

export function LeadsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState<LeadStage | undefined>(undefined);
  const { data, isLoading } = useLeads({ page, limit: 10, search: search || undefined, stage });
  const counts = data?.counts ?? {};

  const [selected, setSelected] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();
  const refresh = () => qc.invalidateQueries({ queryKey: ['leads'] });

  const submitCreate = async () => {
    const v = await form.validateFields();
    try {
      await createLead({
        shopName: v.shopName,
        contactName: v.contactName,
        phone: v.phone,
        email: v.email,
        city: v.city,
        estValuePaise: v.estValue != null ? Math.round(v.estValue * 100) : undefined,
      });
      message.success('Lead added');
      setCreateOpen(false);
      form.resetFields();
      refresh();
    } catch (e) {
      message.error((e as Error).message ?? 'Failed');
    }
  };

  const changeStage = async (id: string, next: LeadStage) => {
    try {
      await updateLead(id, { stage: next });
      refresh();
    } catch (e) {
      message.error((e as Error).message ?? 'Failed');
    }
  };

  const columns: ColumnsType<Lead> = [
    {
      title: 'Shop',
      key: 'shop',
      render: (_, l) => (
        <Button type="link" style={{ padding: 0, height: 'auto' }} onClick={() => setSelected(l.id)}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 600 }}>{l.shopName}</div>
            <Typography.Text type="secondary">
              {l.contactName ?? '—'} · {l.phone}
            </Typography.Text>
          </div>
        </Button>
      ),
    },
    {
      title: 'Source',
      key: 'source',
      render: (_, l) => <Tag>{l.source === 'SIGNUP' ? 'Sign-up' : 'Prospect'}</Tag>,
    },
    { title: 'City', dataIndex: 'city', key: 'city', render: (c?: string) => c ?? '—' },
    {
      title: 'Value',
      key: 'value',
      render: (_, l) => (l.estValuePaise > 0 ? formatPaise(l.estValuePaise) : '—'),
    },
    {
      title: 'Follow-up',
      key: 'followup',
      render: (_, l) =>
        l.nextFollowUpAt ? (
          <Tag color={dayjs(l.nextFollowUpAt).isBefore(dayjs()) ? 'red' : 'default'}>
            {dayjs(l.nextFollowUpAt).format('DD MMM')}
          </Tag>
        ) : (
          '—'
        ),
    },
    {
      title: 'Stage',
      key: 'stage',
      render: (_, l) => (
        <Select<LeadStage>
          size="small"
          value={l.stage}
          style={{ width: 130 }}
          onChange={(s) => changeStage(l.id, s)}
          options={STAGES.map((s) => ({ value: s, label: <Tag color={STAGE_COLOR[s]}>{s}</Tag> }))}
        />
      ),
    },
  ];

  return (
    <Card
      title="Leads"
      extra={
        <Space>
          <Input.Search
            placeholder="Search shop / phone…"
            allowClear
            onSearch={(v) => {
              setSearch(v);
              setPage(1);
            }}
            style={{ width: 220 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            New lead
          </Button>
        </Space>
      }
    >
      <Radio.Group
        value={stage ?? 'ALL'}
        onChange={(e) => {
          setStage(e.target.value === 'ALL' ? undefined : (e.target.value as LeadStage));
          setPage(1);
        }}
        optionType="button"
        buttonStyle="solid"
        style={{ marginBottom: 16 }}
      >
        <Radio.Button value="ALL">All</Radio.Button>
        {STAGES.map((s) => (
          <Radio.Button key={s} value={s}>
            {s} {counts[s] ? `(${counts[s]})` : ''}
          </Radio.Button>
        ))}
      </Radio.Group>

      <Table<Lead>
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

      <Modal
        title="New lead"
        open={createOpen}
        onOk={submitCreate}
        onCancel={() => setCreateOpen(false)}
        okText="Add lead"
        destroyOnClose
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item name="shopName" label="Shop name" rules={[{ required: true, min: 2 }]}>
            <Input placeholder="Riya Collections" />
          </Form.Item>
          <Space style={{ display: 'flex' }} align="start">
            <Form.Item name="contactName" label="Contact">
              <Input placeholder="Owner name" />
            </Form.Item>
            <Form.Item name="phone" label="Phone" rules={[{ required: true, min: 6 }]}>
              <Input placeholder="9876543210" />
            </Form.Item>
          </Space>
          <Space style={{ display: 'flex' }} align="start">
            <Form.Item name="city" label="City">
              <Input placeholder="Pune" />
            </Form.Item>
            <Form.Item name="estValue" label="Est. value (₹)">
              <InputNumber min={0} style={{ width: 160 }} />
            </Form.Item>
          </Space>
          <Form.Item name="email" label="Email">
            <Input placeholder="shop@example.com" />
          </Form.Item>
        </Form>
      </Modal>

      <LeadDrawer id={selected} onClose={() => setSelected(null)} onChanged={refresh} />
    </Card>
  );
}

function LeadDrawer({ id, onClose, onChanged }: { id: string | null; onClose: () => void; onChanged: () => void }) {
  const qc = useQueryClient();
  const { data: lead, isLoading } = useLead(id);
  const [actForm] = Form.useForm();

  const reload = () => {
    qc.invalidateQueries({ queryKey: ['lead', id] });
    onChanged();
  };

  const logActivity = async () => {
    if (!lead) return;
    const v = await actForm.validateFields();
    try {
      await addActivity({
        type: v.type,
        body: v.body,
        leadId: lead.id,
        followUpAt: v.followUpAt ? v.followUpAt.toISOString() : undefined,
      });
      actForm.resetFields();
      message.success('Logged');
      reload();
    } catch (e) {
      message.error((e as Error).message ?? 'Failed');
    }
  };

  const convert = async () => {
    if (!lead) return;
    try {
      await convertLead(lead.id);
      message.success('Converted — a pending customer was created');
      reload();
    } catch (e) {
      message.error((e as Error).message ?? 'Failed');
    }
  };

  return (
    <Drawer
      title={lead ? lead.shopName : 'Lead'}
      width={520}
      open={Boolean(id)}
      onClose={onClose}
      loading={isLoading}
    >
      {lead && (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Space wrap>
            <Tag color={STAGE_COLOR[lead.stage]}>{lead.stage}</Tag>
            <Tag>{lead.source === 'SIGNUP' ? 'Sign-up' : 'Prospect'}</Tag>
            {lead.store && <Tag color="blue">{lead.store.city}</Tag>}
            {lead.assignedTo && <Tag>{lead.assignedTo.name}</Tag>}
          </Space>
          <Typography.Text type="secondary">
            {lead.contactName ?? '—'} · {lead.phone}
            {lead.city ? ` · ${lead.city}` : ''}
            {lead.estValuePaise > 0 ? ` · est. ${formatPaise(lead.estValuePaise)}` : ''}
          </Typography.Text>

          {lead.stage !== 'WON' && (
            <Button type="primary" ghost onClick={convert}>
              {lead.customerId ? 'Mark won' : 'Convert to customer'}
            </Button>
          )}
          {lead.customer && (
            <Typography.Text type="secondary">
              Linked customer · {lead.customer.status}
            </Typography.Text>
          )}

          <Card size="small" title="Log activity">
            <Form form={actForm} layout="vertical">
              <Space style={{ display: 'flex' }} align="start">
                <Form.Item name="type" label="Type" initialValue="NOTE">
                  <Select style={{ width: 110 }} options={ACTIVITY_TYPES.map((t) => ({ value: t, label: t }))} />
                </Form.Item>
                <Form.Item name="followUpAt" label="Follow-up">
                  <DatePicker showTime format="DD MMM HH:mm" style={{ width: 180 }} />
                </Form.Item>
              </Space>
              <Form.Item name="body" rules={[{ required: true, message: 'Add a note' }]}>
                <Input.TextArea rows={2} placeholder="What happened / next step…" />
              </Form.Item>
              <Button type="primary" onClick={logActivity}>
                Add
              </Button>
            </Form>
          </Card>

          <Typography.Text strong>History</Typography.Text>
          {!lead.activities?.length ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No activity yet" />
          ) : (
            <Timeline
              items={lead.activities.map((a) => ({
                color: a.type === 'CALL' ? 'blue' : a.type === 'VISIT' ? 'green' : 'gray',
                children: (
                  <div>
                    <Space size={6}>
                      <Tag>{a.type}</Tag>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {dayjs(a.createdAt).format('DD MMM, HH:mm')}
                        {a.createdBy ? ` · ${a.createdBy.name}` : ''}
                      </Typography.Text>
                    </Space>
                    <div>{a.body}</div>
                    {a.followUpAt && (
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        ⏰ follow up {dayjs(a.followUpAt).format('DD MMM')}
                      </Typography.Text>
                    )}
                  </div>
                ),
              }))}
            />
          )}
        </Space>
      )}
    </Drawer>
  );
}