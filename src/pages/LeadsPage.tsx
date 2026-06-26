import { useMemo, useState } from 'react';
import {
  Avatar,
  Button,
  Card,
  DatePicker,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Timeline,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { BarChartOutlined, EnvironmentOutlined, PlusOutlined, UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useQueryClient } from '@tanstack/react-query';
import {
  addActivity,
  convertLead,
  createLead,
  updateLead,
  useLead,
  useLeads,
  useSourceAnalytics,
  useVisits,
  type LeadsResponse,
} from '../api/crm.api';
import { useUsers } from '../api/users.api';
import { useAuthStore } from '../store/auth.store';
import { CrmDashboard } from '../components/CrmDashboard';
import { formatPaise } from '../lib/money';
import type { ActivityType, FieldVisit, Lead, LeadSource, LeadStage, SourceAnalyticsRow } from '../types';

const STAGES: LeadStage[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'WON', 'LOST'];
const STAGE_COLOR: Record<LeadStage, string> = {
  NEW: 'default',
  CONTACTED: 'blue',
  QUALIFIED: 'geekblue',
  WON: 'green',
  LOST: 'red',
};
const ACTIVITY_TYPES: ActivityType[] = ['NOTE', 'CALL', 'VISIT', 'EMAIL'];

const initials = (name?: string | null) =>
  (name ?? '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export function LeadsPage() {
  const qc = useQueryClient();
  const me = useAuthStore((s) => s.user);

  const [view, setView] = useState<'board' | 'table' | 'dashboard'>('board');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState<LeadStage | undefined>(undefined);
  const [mine, setMine] = useState(false);
  const [due, setDue] = useState(false);

  const [selected, setSelected] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [visitsOpen, setVisitsOpen] = useState(false);
  const [form] = Form.useForm();

  const assignedToId = mine && me ? me.id : undefined;
  const params = useMemo(
    () =>
      view === 'board'
        ? { limit: 100, search: search || undefined, assignedToId, due: due || undefined }
        : { page, limit: 10, search: search || undefined, stage, assignedToId, due: due || undefined },
    [view, page, search, stage, assignedToId, due],
  );
  const { data, isLoading } = useLeads(params);
  const counts = data?.counts ?? {};

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

  // Optimistically move the card, then reconcile from the server.
  const changeStage = async (id: string, next: LeadStage) => {
    const key = ['leads', params];
    const prev = qc.getQueryData<LeadsResponse>(key);
    qc.setQueryData<LeadsResponse>(key, (old) =>
      old ? { ...old, items: old.items.map((l) => (l.id === id ? { ...l, stage: next } : l)) } : old,
    );
    try {
      await updateLead(id, { stage: next });
      refresh();
    } catch (e) {
      if (prev) qc.setQueryData(key, prev);
      message.error((e as Error).message ?? 'Failed');
    }
  };

  const filters = (
    <Space wrap>
      <Input.Search
        placeholder="Search shop / phone…"
        allowClear
        defaultValue={search}
        onSearch={(v) => {
          setSearch(v);
          setPage(1);
        }}
        style={{ width: 200 }}
      />
      {me && (
        <Tooltip title="Only leads assigned to me">
          <Button type={mine ? 'primary' : 'default'} icon={<UserOutlined />} onClick={() => setMine((m) => !m)}>
            My pipeline
          </Button>
        </Tooltip>
      )}
      <Tooltip title="Follow-up due today or overdue">
        <Button type={due ? 'primary' : 'default'} onClick={() => setDue((d) => !d)}>
          Due
        </Button>
      </Tooltip>
    </Space>
  );

  return (
    <Card
      title={
        <Space>
          Leads
          <Segmented
            size="small"
            value={view}
            onChange={(v) => setView(v as 'board' | 'table' | 'dashboard')}
            options={[
              { label: 'Board', value: 'board' },
              { label: 'Table', value: 'table' },
              { label: 'Insights', value: 'dashboard' },
            ]}
          />
        </Space>
      }
      extra={
        <Space>
          <Button icon={<EnvironmentOutlined />} onClick={() => setVisitsOpen(true)}>
            Field visits
          </Button>
          <Button icon={<BarChartOutlined />} onClick={() => setAnalyticsOpen(true)}>
            Sources
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            New lead
          </Button>
        </Space>
      }
    >
      {view !== 'dashboard' && <div style={{ marginBottom: 16 }}>{filters}</div>}

      {view === 'dashboard' ? (
        <CrmDashboard />
      ) : view === 'board' ? (
        <PipelineBoard
          leads={data?.items ?? []}
          loading={isLoading}
          onMove={changeStage}
          onOpen={setSelected}
        />
      ) : (
        <LeadsTable
          data={data}
          loading={isLoading}
          page={page}
          counts={counts}
          stage={stage}
          onStage={(s) => {
            setStage(s);
            setPage(1);
          }}
          onPage={setPage}
          onChangeStage={changeStage}
          onOpen={setSelected}
        />
      )}

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

      <SourceAnalyticsModal open={analyticsOpen} onClose={() => setAnalyticsOpen(false)} />
      <FieldVisitsModal open={visitsOpen} onClose={() => setVisitsOpen(false)} />
      <LeadDrawer id={selected} onClose={() => setSelected(null)} onChanged={refresh} />
    </Card>
  );
}

// ---- Kanban board -----------------------------------------------------------

function PipelineBoard({
  leads,
  loading,
  onMove,
  onOpen,
}: {
  leads: Lead[];
  loading: boolean;
  onMove: (id: string, stage: LeadStage) => void;
  onOpen: (id: string) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<LeadStage | null>(null);

  const byStage = useMemo(() => {
    const g: Record<LeadStage, Lead[]> = { NEW: [], CONTACTED: [], QUALIFIED: [], WON: [], LOST: [] };
    for (const l of leads) g[l.stage]?.push(l);
    return g;
  }, [leads]);

  return (
    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, opacity: loading ? 0.6 : 1 }}>
      {STAGES.map((s) => (
        <div
          key={s}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(s);
          }}
          onDragLeave={() => setOver((o) => (o === s ? null : o))}
          onDrop={() => {
            if (dragId) onMove(dragId, s);
            setDragId(null);
            setOver(null);
          }}
          style={{
            flex: '0 0 270px',
            background: over === s ? '#e6f4ff' : '#fafafa',
            border: `1px solid ${over === s ? '#91caff' : '#f0f0f0'}`,
            borderRadius: 8,
            padding: 8,
            minHeight: 360,
            transition: 'background 0.15s',
          }}
        >
          <Space style={{ justifyContent: 'space-between', width: '100%', marginBottom: 8 }}>
            <Tag color={STAGE_COLOR[s]} style={{ margin: 0 }}>
              {s}
            </Tag>
            <Typography.Text type="secondary">{byStage[s].length}</Typography.Text>
          </Space>

          {byStage[s].length === 0 ? (
            <div style={{ textAlign: 'center', color: '#bfbfbf', fontSize: 12, padding: '24px 0' }}>
              Drop here
            </div>
          ) : (
            byStage[s].map((l) => (
              <LeadCard
                key={l.id}
                lead={l}
                dragging={dragId === l.id}
                onDragStart={() => setDragId(l.id)}
                onDragEnd={() => setDragId(null)}
                onClick={() => onOpen(l.id)}
              />
            ))
          )}
        </div>
      ))}
    </div>
  );
}

function LeadCard({
  lead,
  dragging,
  onDragStart,
  onDragEnd,
  onClick,
}: {
  lead: Lead;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onClick: () => void;
}) {
  const overdue = lead.nextFollowUpAt && dayjs(lead.nextFollowUpAt).isBefore(dayjs());
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      style={{
        background: '#fff',
        border: '1px solid #f0f0f0',
        borderRadius: 6,
        padding: '8px 10px',
        marginBottom: 8,
        cursor: 'grab',
        opacity: dragging ? 0.4 : 1,
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{lead.shopName}</div>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {lead.contactName ?? '—'} · {lead.phone}
      </Typography.Text>
      <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {lead.estValuePaise > 0 && <Tag style={{ margin: 0 }}>{formatPaise(lead.estValuePaise)}</Tag>}
        {lead.source === 'SIGNUP' && (
          <Tag color="purple" style={{ margin: 0 }}>
            Sign-up
          </Tag>
        )}
        {lead.nextFollowUpAt && (
          <Tag color={overdue ? 'red' : 'default'} style={{ margin: 0 }}>
            {dayjs(lead.nextFollowUpAt).format('DD MMM')}
          </Tag>
        )}
        {lead.assignedTo && (
          <Tooltip title={lead.assignedTo.name}>
            <Avatar size={20} style={{ background: '#1677ff', fontSize: 10, marginLeft: 'auto' }}>
              {initials(lead.assignedTo.name)}
            </Avatar>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

// ---- Table view -------------------------------------------------------------

function LeadsTable({
  data,
  loading,
  page,
  counts,
  stage,
  onStage,
  onPage,
  onChangeStage,
  onOpen,
}: {
  data: LeadsResponse | undefined;
  loading: boolean;
  page: number;
  counts: Record<string, number>;
  stage: LeadStage | undefined;
  onStage: (s: LeadStage | undefined) => void;
  onPage: (p: number) => void;
  onChangeStage: (id: string, s: LeadStage) => void;
  onOpen: (id: string) => void;
}) {
  const columns: ColumnsType<Lead> = [
    {
      title: 'Shop',
      key: 'shop',
      render: (_, l) => (
        <Button type="link" style={{ padding: 0, height: 'auto' }} onClick={() => onOpen(l.id)}>
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
    {
      title: 'Owner',
      key: 'owner',
      render: (_, l) => (l.assignedTo ? l.assignedTo.name : <Typography.Text type="secondary">Unassigned</Typography.Text>),
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
          onChange={(s) => onChangeStage(l.id, s)}
          options={STAGES.map((s) => ({ value: s, label: <Tag color={STAGE_COLOR[s]}>{s}</Tag> }))}
        />
      ),
    },
  ];

  return (
    <>
      <Space wrap style={{ marginBottom: 16 }}>
        <Button type={stage === undefined ? 'primary' : 'default'} onClick={() => onStage(undefined)}>
          All
        </Button>
        {STAGES.map((s) => (
          <Button key={s} type={stage === s ? 'primary' : 'default'} onClick={() => onStage(s)}>
            {s} {counts[s] ? `(${counts[s]})` : ''}
          </Button>
        ))}
      </Space>

      <Table<Lead>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={data?.items ?? []}
        pagination={{
          current: page,
          pageSize: 10,
          total: data?.pagination.total ?? 0,
          onChange: onPage,
          showSizeChanger: false,
        }}
      />
    </>
  );
}

// ---- Source analytics -------------------------------------------------------

const SOURCE_LABEL: Record<LeadSource, string> = { MANUAL: 'Prospecting', SIGNUP: 'Self sign-up' };

function SourceAnalyticsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, isLoading } = useSourceAnalytics(open);
  const columns: ColumnsType<SourceAnalyticsRow> = [
    { title: 'Source', dataIndex: 'source', key: 'source', render: (s: LeadSource) => SOURCE_LABEL[s] ?? s },
    { title: 'Leads', dataIndex: 'total', key: 'total' },
    { title: 'Won', dataIndex: 'won', key: 'won' },
    {
      title: 'Conversion',
      key: 'rate',
      render: (_, r) => <Progress percent={r.conversionRate} size="small" style={{ width: 160 }} />,
    },
  ];
  return (
    <Modal title="Lead sources — conversion" open={open} onCancel={onClose} footer={null} width={560}>
      <Table<SourceAnalyticsRow>
        rowKey="source"
        size="small"
        loading={isLoading}
        columns={columns}
        dataSource={data ?? []}
        pagination={false}
        locale={{ emptyText: 'No leads yet' }}
      />
    </Modal>
  );
}

// ---- Field-visit log --------------------------------------------------------

function FieldVisitsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, isLoading } = useVisits(30, open);
  const columns: ColumnsType<FieldVisit> = [
    {
      title: 'When',
      key: 'when',
      render: (_, v) => dayjs(v.createdAt).format('DD MMM, HH:mm'),
    },
    {
      title: 'Shop',
      key: 'shop',
      render: (_, v) => v.lead?.shopName ?? v.customer?.shopName ?? '—',
    },
    { title: 'Agent', key: 'agent', render: (_, v) => v.createdBy?.name ?? '—' },
    { title: 'Notes', dataIndex: 'body', key: 'body', ellipsis: true },
    {
      title: 'Location',
      key: 'loc',
      render: (_, v) =>
        v.latitude != null && v.longitude != null ? (
          <a
            href={`https://www.google.com/maps?q=${v.latitude},${v.longitude}`}
            target="_blank"
            rel="noreferrer"
          >
            <EnvironmentOutlined /> Map
          </a>
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        ),
    },
  ];
  return (
    <Modal title="Field visits (last 30 days)" open={open} onCancel={onClose} footer={null} width={720}>
      <Table<FieldVisit>
        rowKey="id"
        size="small"
        loading={isLoading}
        columns={columns}
        dataSource={data ?? []}
        pagination={{ pageSize: 8, showSizeChanger: false }}
        locale={{ emptyText: 'No field visits logged yet' }}
      />
    </Modal>
  );
}

// ---- Lead detail drawer -----------------------------------------------------

function LeadDrawer({ id, onClose, onChanged }: { id: string | null; onClose: () => void; onChanged: () => void }) {
  const qc = useQueryClient();
  const { data: lead, isLoading } = useLead(id);
  const { data: users } = useUsers();
  const me = useAuthStore((s) => s.user);
  const [actForm] = Form.useForm();
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);

  const captureGeo = () => {
    if (!navigator.geolocation) {
      message.error('Geolocation is not available on this device');
      return;
    }
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoBusy(false);
        message.success('Location captured');
      },
      (err) => {
        setGeoBusy(false);
        message.error(err.message || 'Could not get your location');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const reload = () => {
    qc.invalidateQueries({ queryKey: ['lead', id] });
    onChanged();
  };

  const assign = async (assignedToId: string | null) => {
    if (!lead) return;
    try {
      await updateLead(lead.id, { assignedToId });
      message.success(assignedToId ? 'Assigned' : 'Unassigned');
      reload();
    } catch (e) {
      message.error((e as Error).message ?? 'Failed');
    }
  };

  const logActivity = async () => {
    if (!lead) return;
    const v = await actForm.validateFields();
    const isVisit = v.type === 'VISIT';
    try {
      await addActivity({
        type: v.type,
        body: v.body,
        leadId: lead.id,
        followUpAt: v.followUpAt ? v.followUpAt.toISOString() : undefined,
        latitude: isVisit && geo ? geo.lat : undefined,
        longitude: isVisit && geo ? geo.lng : undefined,
      });
      actForm.resetFields();
      setGeo(null);
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

  const assignable = (users ?? []).filter((u) => u.isActive);

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
          </Space>
          <Typography.Text type="secondary">
            {lead.contactName ?? '—'} · {lead.phone}
            {lead.city ? ` · ${lead.city}` : ''}
            {lead.estValuePaise > 0 ? ` · est. ${formatPaise(lead.estValuePaise)}` : ''}
          </Typography.Text>

          <Card size="small" title="Owner">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Select
                allowClear
                placeholder="Unassigned"
                style={{ width: '100%' }}
                value={lead.assignedTo?.id ?? undefined}
                onChange={(v) => assign(v ?? null)}
                options={assignable.map((u) => ({ value: u.id, label: `${u.name} (${u.role})` }))}
              />
              {me && lead.assignedTo?.id !== me.id && (
                <Button size="small" onClick={() => assign(me.id)}>
                  Assign to me
                </Button>
              )}
            </Space>
          </Card>

          {lead.stage !== 'WON' && (
            <Button type="primary" ghost onClick={convert}>
              {lead.customerId ? 'Mark won' : 'Convert to customer'}
            </Button>
          )}
          {lead.customer && (
            <Typography.Text type="secondary">Linked customer · {lead.customer.status}</Typography.Text>
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
              <Form.Item noStyle shouldUpdate={(p, c) => p.type !== c.type}>
                {() =>
                  actForm.getFieldValue('type') === 'VISIT' ? (
                    <div style={{ marginBottom: 12 }}>
                      <Button size="small" icon={<EnvironmentOutlined />} loading={geoBusy} onClick={captureGeo}>
                        {geo ? 'Update GPS check-in' : 'Capture GPS check-in'}
                      </Button>
                      {geo && (
                        <Tag color="green" style={{ marginLeft: 8 }}>
                          {geo.lat.toFixed(5)}, {geo.lng.toFixed(5)}
                        </Tag>
                      )}
                    </div>
                  ) : null
                }
              </Form.Item>
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
                    {a.latitude != null && a.longitude != null && (
                      <a
                        href={`https://www.google.com/maps?q=${a.latitude},${a.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: 12 }}
                      >
                        <EnvironmentOutlined /> View check-in
                      </a>
                    )}
                    {a.followUpAt && (
                      <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
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
