import { useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Radio,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useQueryClient } from '@tanstack/react-query';
import {
  approveCustomer,
  rejectCustomer,
  updateCustomer,
  useCustomers,
} from '../api/customers.api';
import { formatPaise } from '../lib/money';
import type { Customer, CustomerStatus } from '../types';

const STATUS_TAG: Record<CustomerStatus, { color: string; label: string }> = {
  PENDING: { color: 'orange', label: 'Pending' },
  APPROVED: { color: 'green', label: 'Approved' },
  REJECTED: { color: 'red', label: 'Rejected' },
};

interface CreditForm {
  creditApproved: boolean;
  creditLimit: number; // rupees
  creditDays: number;
}

export function CustomersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<CustomerStatus | undefined>(undefined);
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
        return <Tag color={t.color}>{t.label}</Tag>;
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
      title: 'Orders',
      key: 'orders',
      render: (_, r) => r._count?.orders ?? 0,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, r) =>
        r.status === 'PENDING' ? (
          <Space>
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
          </Space>
        ) : r.status === 'APPROVED' ? (
          <Button size="small" onClick={() => openApprove(r)}>
            {r.creditApproved ? 'Edit credit' : 'Grant credit'}
          </Button>
        ) : (
          <Typography.Text type="secondary">{r.rejectionReason ?? 'Rejected'}</Typography.Text>
        ),
    },
  ];

  return (
    <Card
      title="Customers"
      extra={
        <Space>
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
    </Card>
  );
}
