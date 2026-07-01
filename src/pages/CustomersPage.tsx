import { useState } from 'react';
import {
  Button,
  Card,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Timeline,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveCustomer,
  rejectCustomer,
  updateCustomer,
  useCustomerInsights,
  useCustomers,
  winbackCustomer,
} from '../api/customers.api';
import { addActivity, fetchActivities } from '../api/crm.api';
import { useBroadcast } from '../api/notifications.api';
import { useStores } from '../api/stores.api';
import { useClearAllCarts } from '../api/cart.api';
import { useAuthStore } from '../store/auth.store';
import { formatPaise } from '../lib/money';
import { StatusPill } from '../components/StatusPill';
import type { Customer, CustomerSegment, CustomerStatus } from '../types';

const STATUS_TAG: Record<CustomerStatus, { color: string; label: string }> = {
  PENDING: { color: 'orange', label: 'Pending' },
  APPROVED: { color: 'green', label: 'Approved' },
  REJECTED: { color: 'red', label: 'Rejected' },
};

const SEGMENT_TAG: Record<CustomerSegment, { color: string; label: string }> = {
  NEW: { color: 'default', label: 'New' },
  ACTIVE: { color: 'blue', label: 'Active' },
  HIGH_VALUE: { color: 'gold', label: 'High value' },
  AT_RISK: { color: 'orange', label: 'At risk' },
  DORMANT: { color: 'red', label: 'Dormant' },
};

interface CreditForm {
  creditApproved: boolean;
  creditLimit: number; // rupees
  creditDays: number;
}

export function CustomersPage() {
  const qc = useQueryClient();
  const isAdmin = useAuthStore((s) => s.user?.role === 'ADMIN');
  const clearAllCarts = useClearAllCarts();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<CustomerStatus | undefined>(undefined);
  const [notesFor, setNotesFor] = useState<Customer | null>(null);
  const [insightsFor, setInsightsFor] = useState<Customer | null>(null);
  const [messaging, setMessaging] = useState(false);

  const onClearAllCarts = async () => {
    try {
      const removed = await clearAllCarts.mutateAsync();
      message.success(`Cleared all carts — ${removed} line${removed === 1 ? '' : 's'} removed`);
    } catch (e) {
      message.error((e as Error).message ?? 'Failed to clear carts');
    }
  };
  const { data, isLoading } = useCustomers({
    page,
    limit: 10,
    search: search || undefined,
    status,
  });

  // Approve/credit modal
  const [target, setTarget] = useState<Customer | null>(null);
  const [form] = Form.useForm<CreditForm>();
  const refresh = () => qc.invalidateQueries({ queryKey: ['customers'] });

  const openApprove = (c: Customer) => {
    setTarget(c);
    form.setFieldsValue({
      creditApproved: c.creditApproved,
      creditLimit: c.creditLimitPaise / 100,
      creditDays: c.creditDays || 30,
    });
  };

  const submit = async () => {
    if (!target) return;
    const v = await form.validateFields();
    const payload = {
      creditApproved: v.creditApproved,
      creditLimitPaise: v.creditApproved ? Math.round((v.creditLimit ?? 0) * 100) : 0,
      creditDays: v.creditDays ?? 0,
    };
    try {
      if (target.status === 'PENDING') await approveCustomer(target.id, payload);
      else await updateCustomer(target.id, payload);
      message.success(target.status === 'PENDING' ? `${target.shopName} approved` : 'Credit updated');
      setTarget(null);
      refresh();
    } catch (err) {
      message.error((err as Error).message ?? 'Failed');
    }
  };

  const doReject = async (c: Customer, reason?: string) => {
    try {
      await rejectCustomer(c.id, reason);
      message.success(`${c.shopName} rejected`);
      refresh();
    } catch (err) {
      message.error((err as Error).message ?? 'Failed');
    }
  };

  const columns: ColumnsType<Customer> = [
    {
      title: 'Shop',
      dataIndex: 'shopName',
      key: 'shopName',
      render: (shopName: string, record) => (
        <div>
          <div style={{ fontWeight: 600 }}>{shopName}</div>
          <Typography.Text type="secondary">
            {record.ownerName ?? '—'} · {record.phone}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, r) => {
        const t = STATUS_TAG[r.status];
        return <StatusPill color={t.color}>{t.label}</StatusPill>;
      },
    },
    {
      title: 'Store',
      key: 'store',
      render: (_, r) => (r.store ? <Tag color="blue">{r.store.city}</Tag> : <Tag>Unassigned</Tag>),
    },
    {
      title: 'Credit',
      key: 'credit',
      render: (_, r) =>
        r.creditApproved && r.creditLimitPaise > 0 ? (
          <span>
            {formatPaise(r.creditLimitPaise)}
            <Typography.Text type="secondary"> · {r.creditDays}d</Typography.Text>
          </span>
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        ),
    },
    {
      title: 'Value',
      key: 'value',
      render: (_, r) => {
        const seg = r.segment ? SEGMENT_TAG[r.segment] : null;
        return (
          <div>
            {seg && <StatusPill color={seg.color}>{seg.label}</StatusPill>}
            <div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {r.orderCount ?? 0} orders · {formatPaise(r.ltvPaise ?? 0)}
                {r.lastOrderAt ? ` · last ${dayjs(r.lastOrderAt).format('DD MMM')}` : ''}
              </Typography.Text>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, r) => (
        <Space>
          {r.status === 'PENDING' ? (
            <>
              <Button type="primary" size="small" onClick={() => openApprove(r)}>
                Approve
              </Button>
              <Popconfirm
                title="Reject this registration?"
                description="The shop won't be able to sign in."
                onConfirm={() => doReject(r)}
                okText="Reject"
                okButtonProps={{ danger: true }}
              >
                <Button size="small" danger>
                  Reject
                </Button>
              </Popconfirm>
            </>
          ) : r.status === 'APPROVED' ? (
            <Button size="small" onClick={() => openApprove(r)}>
              {r.creditApproved ? 'Edit credit' : 'Grant credit'}
            </Button>
          ) : (
            <Typography.Text type="secondary">{r.rejectionReason ?? 'Rejected'}</Typography.Text>
          )}
          <Button size="small" type="link" onClick={() => setInsightsFor(r)}>
            360
          </Button>
          <Button size="small" type="link" onClick={() => setNotesFor(r)}>
            Notes
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Customers"
      extra={
        <Space>
          <Button onClick={() => setMessaging(true)}>Message customers</Button>
          {isAdmin && (
            <Popconfirm
              title="Clear every customer's cart?"
              description="Removes all items from all carts. This cannot be undone."
              okText="Clear all carts"
              okButtonProps={{ danger: true, loading: clearAllCarts.isPending }}
              onConfirm={onClearAllCarts}
            >
              <Button danger>Clear all carts</Button>
            </Popconfirm>
          )}
          <Radio.Group
            value={status ?? 'ALL'}
            onChange={(e) => {
              setStatus(e.target.value === 'ALL' ? undefined : (e.target.value as CustomerStatus));
              setPage(1);
            }}
            optionType="button"
            buttonStyle="solid"
            options={[
              { label: 'All', value: 'ALL' },
              { label: 'Pending', value: 'PENDING' },
              { label: 'Approved', value: 'APPROVED' },
            ]}
          />
          <Input.Search
            placeholder="Search shop / phone…"
            allowClear
            onSearch={(v) => {
              setSearch(v);
              setPage(1);
            }}
            style={{ width: 220 }}
          />
        </Space>
      }
    >
      <Table<Customer>
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
        title={
          target?.status === 'PENDING'
            ? `Approve ${target?.shopName}`
            : `Credit — ${target?.shopName ?? ''}`
        }
        open={Boolean(target)}
        onOk={submit}
        onCancel={() => setTarget(null)}
        okText={target?.status === 'PENDING' ? 'Approve' : 'Save'}
        destroyOnClose
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          {target?.status === 'PENDING' && (
            <Typography.Paragraph type="secondary">
              Approving lets this shop sign in. Optionally grant a credit facility now.
            </Typography.Paragraph>
          )}
          <Form.Item name="creditApproved" label="Credit approved" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(p, c) => p.creditApproved !== c.creditApproved}
          >
            {({ getFieldValue }) =>
              getFieldValue('creditApproved') ? (
                <Space>
                  <Form.Item
                    name="creditLimit"
                    label="Credit limit (₹)"
                    rules={[{ required: true, type: 'number', min: 0 }]}
                  >
                    <InputNumber min={0} style={{ width: 180 }} />
                  </Form.Item>
                  <Form.Item name="creditDays" label="Terms (days)">
                    <InputNumber min={0} style={{ width: 120 }} />
                  </Form.Item>
                </Space>
              ) : null
            }
          </Form.Item>
        </Form>
      </Modal>

      <CustomerNotesDrawer customer={notesFor} onClose={() => setNotesFor(null)} />
      <Customer360Drawer customer={insightsFor} onClose={() => setInsightsFor(null)} />
      <BroadcastModal open={messaging} isAdmin={isAdmin} onClose={() => setMessaging(false)} />
    </Card>
  );
}

interface BroadcastForm {
  title: string;
  body: string;
  status?: CustomerStatus;
  storeId?: string;
}

/** Compose an in-app message and send it to a segment of customers. */
function BroadcastModal({
  open,
  isAdmin,
  onClose,
}: {
  open: boolean;
  isAdmin: boolean;
  onClose: () => void;
}) {
  const [form] = Form.useForm<BroadcastForm>();
  const broadcast = useBroadcast();
  const { data: stores } = useStores();

  const submit = async () => {
    const v = await form.validateFields();
    try {
      const res = await broadcast.mutateAsync({
        title: v.title.trim(),
        body: v.body.trim(),
        status: v.status,
        storeId: v.storeId,
      });
      message.success(
        res.sent > 0
          ? `Message sent to ${res.sent} customer${res.sent === 1 ? '' : 's'}`
          : 'No customers matched that segment',
      );
      form.resetFields();
      onClose();
    } catch (e) {
      message.error((e as Error).message ?? 'Failed to send');
    }
  };

  return (
    <Modal
      title="Message customers"
      open={open}
      onOk={submit}
      confirmLoading={broadcast.isPending}
      onCancel={onClose}
      okText="Send message"
      destroyOnClose
    >
      <Typography.Paragraph type="secondary">
        Sends an in-app notification to the customers' app. Agents reach their own store's
        customers; admins can target a specific store.
      </Typography.Paragraph>
      <Form form={form} layout="vertical" requiredMark="optional" initialValues={{ status: 'APPROVED' }}>
        <Form.Item name="title" label="Title" rules={[{ required: true, min: 2, max: 120 }]}>
          <Input placeholder="New season stock has arrived!" maxLength={120} />
        </Form.Item>
        <Form.Item name="body" label="Message" rules={[{ required: true, min: 2, max: 500 }]}>
          <Input.TextArea rows={3} maxLength={500} placeholder="Fresh kurtis and sarees now in stock — order before Friday for bulk discounts." />
        </Form.Item>
        <Space align="start" wrap>
          <Form.Item name="status" label="Send to" tooltip="Filter by registration status">
            <Select
              style={{ width: 180 }}
              options={[
                { value: 'APPROVED', label: 'Approved customers' },
                { value: 'PENDING', label: 'Pending customers' },
                { value: undefined as unknown as string, label: 'All (any status)' },
              ]}
            />
          </Form.Item>
          {isAdmin && (
            <Form.Item name="storeId" label="Store (optional)">
              <Select
                allowClear
                style={{ width: 200 }}
                placeholder="All stores"
                options={(stores ?? []).map((s) => ({ value: s.id, label: `${s.name} · ${s.city}` }))}
              />
            </Form.Item>
          )}
        </Space>
      </Form>
    </Modal>
  );
}

function Customer360Drawer({ customer, onClose }: { customer: Customer | null; onClose: () => void }) {
  const { data, isLoading } = useCustomerInsights(customer?.id);
  const [winback, setWinback] = useState<{ code: string; percent: number } | null>(null);
  const [issuing, setIssuing] = useState(false);

  const issue = async () => {
    if (!customer) return;
    setIssuing(true);
    try {
      const res = await winbackCustomer(customer.id, 10);
      setWinback(res);
      message.success(`Win-back coupon ${res.code} created`);
    } catch (e) {
      message.error((e as Error).message ?? 'Failed');
    } finally {
      setIssuing(false);
    }
  };

  const seg = data ? SEGMENT_TAG[data.segment] : null;

  return (
    <Drawer
      title={customer ? `Customer 360 · ${customer.shopName}` : 'Customer 360'}
      width={520}
      open={Boolean(customer)}
      onClose={() => {
        setWinback(null);
        onClose();
      }}
    >
      {isLoading || !data ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Loading…" />
      ) : (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Space>
            {seg && <StatusPill color={seg.color}>{seg.label}</StatusPill>}
            <Typography.Text type="secondary">
              {data.creditApproved ? `Credit ${formatPaise(data.creditLimitPaise)}` : 'No credit'}
            </Typography.Text>
          </Space>

          <Descriptions column={2} size="small" bordered>
            <Descriptions.Item label="Lifetime value">{formatPaise(data.ltvPaise)}</Descriptions.Item>
            <Descriptions.Item label="Orders">{data.orderCount}</Descriptions.Item>
            <Descriptions.Item label="Avg order">{formatPaise(data.aovPaise)}</Descriptions.Item>
            <Descriptions.Item label="Order cadence">
              {data.avgDaysBetweenOrders != null ? `~${data.avgDaysBetweenOrders}d` : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Last order">
              {data.lastOrderAt
                ? `${dayjs(data.lastOrderAt).format('DD MMM YYYY')} (${data.daysSinceLastOrder}d ago)`
                : 'Never'}
            </Descriptions.Item>
            <Descriptions.Item label="On-time pay">
              {data.onTimePaymentRate != null ? `${data.onTimePaymentRate}%` : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Outstanding">{formatPaise(data.outstandingPaise)}</Descriptions.Item>
            <Descriptions.Item label="Overdue">
              <Typography.Text type={data.overduePaise > 0 ? 'danger' : undefined}>
                {formatPaise(data.overduePaise)}
              </Typography.Text>
            </Descriptions.Item>
          </Descriptions>

          {data.topCategories.length > 0 && (
            <div>
              <Typography.Text strong>Top categories</Typography.Text>
              <div style={{ marginTop: 6 }}>
                {data.topCategories.map((c) => (
                  <Tag key={c.name} style={{ marginBottom: 4 }}>
                    {c.name} · {formatPaise(c.spendPaise)}
                  </Tag>
                ))}
              </div>
            </div>
          )}

          <div>
            <Button type="primary" onClick={issue} loading={issuing}>
              Create win-back offer (10% off)
            </Button>
            {winback && (
              <Typography.Paragraph style={{ marginTop: 10 }}>
                Share code <Typography.Text strong copyable>{winback.code}</Typography.Text> with{' '}
                {customer?.shopName} — single use, valid 30 days.
              </Typography.Paragraph>
            )}
          </div>
        </Space>
      )}
    </Drawer>
  );
}

function CustomerNotesDrawer({ customer, onClose }: { customer: Customer | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [body, setBody] = useState('');
  const { data: activities, isLoading } = useQuery({
    queryKey: ['activities', 'customer', customer?.id],
    queryFn: () => fetchActivities({ customerId: customer!.id }),
    enabled: Boolean(customer),
  });

  const add = async () => {
    if (!customer || !body.trim()) return;
    try {
      await addActivity({ type: 'NOTE', body: body.trim(), customerId: customer.id });
      setBody('');
      qc.invalidateQueries({ queryKey: ['activities', 'customer', customer.id] });
    } catch (e) {
      message.error((e as Error).message ?? 'Failed');
    }
  };

  return (
    <Drawer
      title={customer ? `Notes · ${customer.shopName}` : 'Notes'}
      width={480}
      open={Boolean(customer)}
      onClose={onClose}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Input.TextArea
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a note about this customer…"
        />
        <Button type="primary" onClick={add} disabled={!body.trim()}>
          Add note
        </Button>
        {isLoading ? null : !activities?.length ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No notes yet" />
        ) : (
          <Timeline
            items={activities.map((a) => ({
              children: (
                <div>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {dayjs(a.createdAt).format('DD MMM, HH:mm')}
                    {a.createdBy ? ` · ${a.createdBy.name}` : ''}
                  </Typography.Text>
                  <div>{a.body}</div>
                </div>
              ),
            }))}
          />
        )}
      </Space>
    </Drawer>
  );
}
