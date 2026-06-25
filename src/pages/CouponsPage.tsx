import { useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined } from '@ant-design/icons';
import { formatPaise } from '../lib/money';
import {
  useCoupons,
  useCreateCoupon,
  useDeleteCoupon,
  useUpdateCoupon,
  type Coupon,
  type CouponInput,
} from '../api/coupons.api';

interface FormValues {
  code: string;
  description?: string;
  type: 'PERCENT' | 'FIXED';
  value: number; // PERCENT: percent; FIXED: rupees
  minOrder?: number; // rupees
  maxDiscount?: number; // rupees
  usageLimit?: number;
  perCustomerLimit?: number;
  isActive: boolean;
}

const toPaise = (rupees?: number | null) =>
  rupees == null ? null : Math.round(rupees * 100);

export function CouponsPage() {
  const { data, isLoading } = useCoupons();
  const create = useCreateCoupon();
  const update = useUpdateCoupon();
  const remove = useDeleteCoupon();

  const [editing, setEditing] = useState<Coupon | null>(null);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<FormValues>();
  const type = Form.useWatch('type', form);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ type: 'PERCENT', isActive: true });
    setOpen(true);
  };

  const openEdit = (c: Coupon) => {
    setEditing(c);
    form.setFieldsValue({
      code: c.code,
      description: c.description ?? undefined,
      type: c.type,
      value: c.type === 'FIXED' ? c.value / 100 : c.value,
      minOrder: c.minOrderPaise ? c.minOrderPaise / 100 : undefined,
      maxDiscount: c.maxDiscountPaise != null ? c.maxDiscountPaise / 100 : undefined,
      usageLimit: c.usageLimit ?? undefined,
      perCustomerLimit: c.perCustomerLimit ?? undefined,
      isActive: c.isActive,
    });
    setOpen(true);
  };

  const submit = async () => {
    const v = await form.validateFields();
    const input: CouponInput = {
      code: v.code.trim().toUpperCase(),
      description: v.description?.trim() || undefined,
      type: v.type,
      value: v.type === 'FIXED' ? Math.round(v.value * 100) : v.value,
      minOrderPaise: toPaise(v.minOrder) ?? 0,
      maxDiscountPaise: v.type === 'PERCENT' ? toPaise(v.maxDiscount) : null,
      usageLimit: v.usageLimit ?? null,
      perCustomerLimit: v.perCustomerLimit ?? null,
      isActive: v.isActive,
    };
    try {
      if (editing) await update.mutateAsync({ id: editing.id, input });
      else await create.mutateAsync(input);
      message.success(`Coupon ${input.code} ${editing ? 'updated' : 'created'}`);
      setOpen(false);
    } catch (err) {
      message.error((err as Error).message ?? 'Failed to save coupon');
    }
  };

  const columns: ColumnsType<Coupon> = [
    {
      title: 'Code',
      key: 'code',
      render: (_, c) => (
        <div>
          <Typography.Text strong>{c.code}</Typography.Text>
          {!c.isActive && (
            <Tag color="default" style={{ marginLeft: 8 }}>
              inactive
            </Tag>
          )}
          {c.description && (
            <div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {c.description}
              </Typography.Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Discount',
      key: 'discount',
      render: (_, c) =>
        c.type === 'PERCENT' ? (
          <span>
            {c.value}% off
            {c.maxDiscountPaise ? ` (max ${formatPaise(c.maxDiscountPaise)})` : ''}
          </span>
        ) : (
          <span>{formatPaise(c.value)} off</span>
        ),
    },
    {
      title: 'Min order',
      key: 'min',
      render: (_, c) => (c.minOrderPaise ? formatPaise(c.minOrderPaise) : '—'),
    },
    {
      title: 'Usage',
      key: 'usage',
      render: (_, c) => (
        <span>
          {c.usedCount}
          {c.usageLimit != null ? ` / ${c.usageLimit}` : ''}
          {c.perCustomerLimit != null ? ` · ${c.perCustomerLimit}/cust` : ''}
        </span>
      ),
    },
    {
      title: '',
      key: 'actions',
      align: 'right',
      render: (_, c) => (
        <Space>
          <Button size="small" type="link" onClick={() => openEdit(c)}>
            Edit
          </Button>
          {c.isActive && (
            <Popconfirm title="Deactivate this coupon?" onConfirm={() => remove.mutate(c.id)}>
              <Button size="small" type="link" danger>
                Deactivate
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Coupons & discounts"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          New coupon
        </Button>
      }
    >
      <Table<Coupon>
        rowKey="id"
        loading={isLoading}
        columns={columns}
        dataSource={data ?? []}
        pagination={false}
      />

      <Modal
        title={editing ? `Edit ${editing.code}` : 'New coupon'}
        open={open}
        onOk={submit}
        confirmLoading={create.isPending || update.isPending}
        onCancel={() => setOpen(false)}
        okText="Save"
        destroyOnClose
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item name="code" label="Code" rules={[{ required: true, min: 2 }]}>
            <Input placeholder="SAVE10" style={{ textTransform: 'uppercase' }} />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input placeholder="10% off your order" />
          </Form.Item>
          <Space style={{ display: 'flex' }} align="start">
            <Form.Item name="type" label="Type" rules={[{ required: true }]}>
              <Select
                style={{ width: 140 }}
                options={[
                  { value: 'PERCENT', label: 'Percent off' },
                  { value: 'FIXED', label: 'Flat amount' },
                ]}
              />
            </Form.Item>
            <Form.Item
              name="value"
              label={type === 'FIXED' ? 'Amount (₹)' : 'Percent (%)'}
              rules={[
                { required: true, type: 'number', min: 1 },
                ...(type === 'PERCENT'
                  ? [{ type: 'number' as const, max: 100, message: '1–100' }]
                  : []),
              ]}
            >
              <InputNumber min={1} style={{ width: 140 }} />
            </Form.Item>
            {type === 'PERCENT' && (
              <Form.Item name="maxDiscount" label="Max discount (₹)">
                <InputNumber min={0} style={{ width: 150 }} placeholder="optional cap" />
              </Form.Item>
            )}
          </Space>
          <Space style={{ display: 'flex' }} align="start">
            <Form.Item name="minOrder" label="Min order (₹)">
              <InputNumber min={0} style={{ width: 150 }} />
            </Form.Item>
            <Form.Item name="usageLimit" label="Total uses">
              <InputNumber min={1} style={{ width: 130 }} placeholder="unlimited" />
            </Form.Item>
            <Form.Item name="perCustomerLimit" label="Per customer">
              <InputNumber min={1} style={{ width: 130 }} placeholder="unlimited" />
            </Form.Item>
          </Space>
          <Form.Item name="isActive" label="Active" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
