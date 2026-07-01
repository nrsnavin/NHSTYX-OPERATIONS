import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Drawer,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Timeline,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  createOrderForCustomer,
  openInvoice,
  useBookShipment,
  useCancelOrder,
  useDeliverOrder,
  useOrder,
  useOrders,
  useRecordPayment,
  useShipOrder,
  useUpdateOrderStatus,
} from '../api/orders.api';
import { useCustomers } from '../api/customers.api';
import { useProducts } from '../api/products.api';
import { formatPaise } from '../lib/money';
import { StatusPill } from '../components/StatusPill';
import type { Order, OrderPaymentStatus, OrderStatus, PaymentMethod } from '../types';

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: 'gold',
  CONFIRMED: 'blue',
  PACKED: 'geekblue',
  SHIPPED: 'purple',
  DELIVERED: 'green',
  CANCELLED: 'red',
  RETURNED: 'volcano',
};

const STATUS_OPTIONS: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PACKED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
];

const PAYMENT_COLORS: Record<OrderPaymentStatus, string> = {
  UNPAID: 'red',
  PARTIALLY_PAID: 'orange',
  PAID: 'green',
  REFUNDED: 'default',
};

export function OrdersPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<OrderStatus | undefined>(undefined);
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const { data, isLoading } = useOrders({ page, limit: 10, status });
  const updateStatus = useUpdateOrderStatus();

  const columns: ColumnsType<Order> = [
    {
      title: 'Order #',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      render: (value: string, record) => (
        <Button type="link" style={{ padding: 0 }} onClick={() => setSelected(record.id)}>
          <Typography.Text strong>{value}</Typography.Text>
        </Button>
      ),
    },
    {
      title: 'Customer',
      key: 'customer',
      render: (_, record) =>
        record.customer ? (
          <div>
            <div>{record.customer.shopName}</div>
            <Typography.Text type="secondary">{record.customer.phone}</Typography.Text>
          </div>
        ) : (
          '—'
        ),
    },
    {
      title: 'Store',
      key: 'store',
      render: (_, record) =>
        record.store ? <Tag color="blue">{record.store.city}</Tag> : <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: 'Total',
      dataIndex: 'totalPaise',
      key: 'total',
      render: (totalPaise: number) => formatPaise(totalPaise),
    },
    {
      title: 'Payment',
      key: 'payment',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <StatusPill color={PAYMENT_COLORS[record.paymentStatus]}>{record.paymentStatus}</StatusPill>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {record.paymentMethod}
            {record.amountDuePaise > 0 ? ` · due ${formatPaise(record.amountDuePaise)}` : ''}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Placed',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('DD MMM'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: OrderStatus, record) => (
        <Select<OrderStatus>
          size="small"
          value={status}
          style={{ width: 130 }}
          loading={updateStatus.isPending}
          onChange={(next) => updateStatus.mutate({ id: record.id, status: next })}
          options={STATUS_OPTIONS.map((s) => ({
            value: s,
            label: <Tag color={STATUS_COLORS[s]}>{s}</Tag>,
          }))}
        />
      ),
    },
    {
      title: '',
      key: 'actions',
      render: (_, record) => (
        <Space size={4}>
          {record.status === 'PENDING' && (
            <Button size="small" type="primary" ghost onClick={() => setSelected(record.id)}>
              Verify
            </Button>
          )}
          <Button
            size="small"
            type="link"
            onClick={() =>
              openInvoice(record.id).catch((e) => message.error((e as Error).message ?? 'Failed'))
            }
          >
            Invoice
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Orders"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreating(true)}>
          New order for customer
        </Button>
      }
    >
      <Space wrap style={{ marginBottom: 16 }}>
        <Button
          shape="round"
          type={status === undefined ? 'primary' : 'default'}
          onClick={() => {
            setStatus(undefined);
            setPage(1);
          }}
        >
          All
        </Button>
        {STATUS_OPTIONS.map((s) => (
          <Button
            key={s}
            shape="round"
            type={status === s ? 'primary' : 'default'}
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
          >
            {s}
          </Button>
        ))}
      </Space>
      <Table<Order>
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
      <OrderDrawer id={selected} onClose={() => setSelected(null)} />
      <CreateOrderModal open={creating} onClose={() => setCreating(false)} />
    </Card>
  );
}

/** Agent/admin places an order on behalf of a customer (phoned-in bulk order). */
function CreateOrderModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const [custSearch, setCustSearch] = useState('');
  const [prodSearch, setProdSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { data: customers } = useCustomers({ status: 'APPROVED', search: custSearch || undefined, limit: 20 });
  const { data: products } = useProducts({ search: prodSearch || undefined, limit: 30 });

  const submit = async () => {
    const v = await form.validateFields();
    setSubmitting(true);
    try {
      const order = await createOrderForCustomer({
        customerId: v.customerId,
        paymentMethod: v.paymentMethod as PaymentMethod,
        items: (v.items ?? []).map((it: { productId: string; quantity: number }) => ({
          productId: it.productId,
          quantity: it.quantity,
        })),
        bankReference: v.paymentMethod === 'BANK_TRANSFER' ? v.bankReference : undefined,
        notes: v.notes,
      });
      message.success(`Order ${order.orderNumber} placed`);
      qc.invalidateQueries({ queryKey: ['orders'] });
      form.resetFields();
      onClose();
    } catch (e) {
      message.error((e as Error).message ?? 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="New order for a customer"
      open={open}
      onOk={submit}
      confirmLoading={submitting}
      onCancel={onClose}
      okText="Place order"
      width={640}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item name="customerId" label="Customer" rules={[{ required: true }]}>
          <Select
            showSearch
            filterOption={false}
            onSearch={setCustSearch}
            placeholder="Search shop name / phone"
            options={(customers?.items ?? []).map((c) => ({
              value: c.id,
              label: `${c.shopName} · ${c.phone}${c.store ? ` · ${c.store.city}` : ''}`,
            }))}
          />
        </Form.Item>

        <div style={{ marginBottom: 8, fontWeight: 600 }}>Items</div>
        <Form.List name="items" initialValue={[{}]}>
          {(fields, { add, remove }) => (
            <>
              {fields.map((field) => (
                <Space key={field.key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                  <Form.Item
                    name={[field.name, 'productId']}
                    rules={[{ required: true, message: 'Pick a product' }]}
                    style={{ minWidth: 360 }}
                  >
                    <Select
                      showSearch
                      filterOption={false}
                      onSearch={setProdSearch}
                      placeholder="Search product"
                      options={(products?.items ?? []).map((p) => ({
                        value: p.id,
                        label: `${p.name}${p.brand ? ` · ${p.brand}` : ''}`,
                      }))}
                    />
                  </Form.Item>
                  <Form.Item
                    name={[field.name, 'quantity']}
                    rules={[{ required: true, type: 'number', min: 1 }]}
                  >
                    <InputNumber min={1} placeholder="Qty" />
                  </Form.Item>
                  {fields.length > 1 && (
                    <MinusCircleOutlined onClick={() => remove(field.name)} />
                  )}
                </Space>
              ))}
              <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} block>
                Add item
              </Button>
            </>
          )}
        </Form.List>

        <Form.Item name="paymentMethod" label="Payment" rules={[{ required: true }]} style={{ marginTop: 16 }}>
          <Select
            placeholder="Select payment method"
            options={[
              { value: 'RAZORPAY', label: 'Online (Razorpay) — customer pays later' },
              { value: 'CREDIT', label: 'Credit (if approved)' },
              { value: 'BANK_TRANSFER', label: 'Bank transfer' },
            ]}
          />
        </Form.Item>
        <Form.Item noStyle shouldUpdate={(p, c) => p.paymentMethod !== c.paymentMethod}>
          {() =>
            form.getFieldValue('paymentMethod') === 'BANK_TRANSFER' ? (
              <Form.Item name="bankReference" label="Bank transfer reference" rules={[{ required: true }]}>
                <Input placeholder="UTR / txn id" />
              </Form.Item>
            ) : null
          }
        </Form.Item>
        <Form.Item name="notes" label="Notes (optional)">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Alert
          type="info"
          showIcon
          message="Online (Razorpay) orders are placed unpaid — the customer pays from the app's Orders screen."
        />
      </Form>
    </Modal>
  );
}

function OrderDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: order, isLoading } = useOrder(id);
  const updateStatus = useUpdateOrderStatus();
  const recordPayment = useRecordPayment();
  const shipOrder = useShipOrder();
  const bookShipment = useBookShipment();
  const deliverOrder = useDeliverOrder();
  const cancelOrder = useCancelOrder();
  const [shipOpen, setShipOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const markDelivered = async () => {
    if (!order) return;
    try {
      await deliverOrder.mutateAsync(order.id);
      message.success('Marked delivered');
    } catch (e) {
      message.error((e as Error).message ?? 'Failed');
    }
  };

  const cancel = async () => {
    if (!order) return;
    try {
      const { data } = await cancelOrder.mutateAsync({
        id: order.id,
        reason: cancelReason.trim() || undefined,
      });
      const refunded = (data as { data?: { refundedPaise?: number } })?.data?.refundedPaise ?? 0;
      message.success(
        refunded > 0
          ? `Order cancelled — items restocked, ${formatPaise(refunded)} refunded`
          : 'Order cancelled — items restocked',
      );
      setCancelReason('');
    } catch (e) {
      message.error((e as Error).message ?? 'Failed to cancel order');
    }
  };

  const confirmBankPayment = async () => {
    if (!order) return;
    const ref = order.payments?.find((p) => p.method === 'BANK_TRANSFER')?.reference ?? undefined;
    try {
      await recordPayment.mutateAsync({
        id: order.id,
        method: 'BANK_TRANSFER',
        amountPaise: order.amountDuePaise || order.totalPaise,
        reference: ref,
      });
      message.success('Payment verified — order confirmed');
    } catch (e) {
      message.error((e as Error).message ?? 'Failed');
    }
  };

  const confirmCredit = async () => {
    if (!order) return;
    try {
      await updateStatus.mutateAsync({ id: order.id, status: 'CONFIRMED' });
      message.success('Credit order confirmed');
    } catch (e) {
      message.error((e as Error).message ?? 'Failed');
    }
  };

  const bankPayment = order?.payments?.find((p) => p.method === 'BANK_TRANSFER');
  const isPendingVerify = order?.status === 'PENDING';
  const canCancel =
    order != null && !['DELIVERED', 'CANCELLED', 'RETURNED'].includes(order.status);

  return (
    <Drawer
      title={order ? `Order ${order.orderNumber}` : 'Order'}
      width={560}
      open={Boolean(id)}
      onClose={onClose}
      loading={isLoading}
      extra={
        order ? (
          <Button
            onClick={() =>
              openInvoice(order.id).catch((e) => message.error((e as Error).message ?? 'Failed'))
            }
          >
            Invoice (PDF)
          </Button>
        ) : null
      }
    >
      {order && (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {isPendingVerify && order.paymentMethod === 'BANK_TRANSFER' && (
            <Alert
              type="warning"
              showIcon
              message="Verify the bank transfer before processing"
              description={
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <span>
                    Customer reference (UTR):{' '}
                    <Typography.Text strong copyable>
                      {bankPayment?.reference ?? '—'}
                    </Typography.Text>
                  </span>
                  <span>Amount: {formatPaise(order.amountDuePaise || order.totalPaise)}</span>
                  <Popconfirm
                    title="Confirm you've received this transfer?"
                    onConfirm={confirmBankPayment}
                    okText="Mark received"
                  >
                    <Button type="primary" loading={recordPayment.isPending}>
                      Mark payment received & confirm
                    </Button>
                  </Popconfirm>
                </Space>
              }
            />
          )}
          {isPendingVerify && order.paymentMethod === 'CREDIT' && (
            <Alert
              type="info"
              showIcon
              message="Credit order awaiting confirmation"
              description={
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <span>Pay-later order on the shop's approved credit. Confirm to process.</span>
                  <Button type="primary" onClick={confirmCredit} loading={updateStatus.isPending}>
                    Confirm credit order
                  </Button>
                </Space>
              }
            />
          )}

          <Descriptions size="small" column={1} bordered>
            <Descriptions.Item label="Shop">{order.customer?.shopName}</Descriptions.Item>
            <Descriptions.Item label="Phone">{order.customer?.phone}</Descriptions.Item>
            {order.store && <Descriptions.Item label="Store">{order.store.name}</Descriptions.Item>}
            <Descriptions.Item label="Status">
              <Tag color={STATUS_COLORS[order.status]}>{order.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Payment">
              {order.paymentMethod} · <Tag color={PAYMENT_COLORS[order.paymentStatus]}>{order.paymentStatus}</Tag>
            </Descriptions.Item>
          </Descriptions>

          {order.status !== 'CANCELLED' && order.status !== 'RETURNED' && (
            <>
              <Divider style={{ margin: '4px 0' }}>Fulfilment</Divider>
              {order.trackingNumber ? (
                <Descriptions size="small" column={1} bordered>
                  <Descriptions.Item label="Courier">{order.courierName ?? '—'}</Descriptions.Item>
                  <Descriptions.Item label="AWB / Tracking">
                    {order.trackingUrl ? (
                      <a href={order.trackingUrl} target="_blank" rel="noreferrer">
                        {order.trackingNumber}
                      </a>
                    ) : (
                      order.trackingNumber
                    )}
                  </Descriptions.Item>
                  {order.shippedAt && (
                    <Descriptions.Item label="Shipped">
                      {dayjs(order.shippedAt).format('DD MMM, h:mm a')}
                    </Descriptions.Item>
                  )}
                  {order.deliveredAt && (
                    <Descriptions.Item label="Delivered">
                      {dayjs(order.deliveredAt).format('DD MMM, h:mm a')}
                    </Descriptions.Item>
                  )}
                </Descriptions>
              ) : (
                <Typography.Text type="secondary">Not dispatched yet.</Typography.Text>
              )}
              <Space>
                {order.status !== 'DELIVERED' && (
                  <Button type="primary" onClick={() => setShipOpen(true)}>
                    {order.trackingNumber ? 'Update shipment' : 'Mark shipped'}
                  </Button>
                )}
                {order.status === 'SHIPPED' && (
                  <Popconfirm title="Mark this order delivered?" onConfirm={markDelivered} okText="Mark delivered">
                    <Button loading={deliverOrder.isPending}>Mark delivered</Button>
                  </Popconfirm>
                )}
              </Space>
            </>
          )}

          <Divider style={{ margin: '4px 0' }}>Items</Divider>
          {order.items.map((it) => (
            <Space key={it.id} style={{ justifyContent: 'space-between', width: '100%' }}>
              <span>
                {it.productName} × {it.quantity}
              </span>
              <span>{formatPaise(it.lineTotalPaise)}</span>
            </Space>
          ))}

          <Divider style={{ margin: '4px 0' }} />
          <Descriptions size="small" column={1}>
            <Descriptions.Item label="Subtotal">{formatPaise(order.subtotalPaise)}</Descriptions.Item>
            <Descriptions.Item label="CGST">{formatPaise(order.cgstPaise)}</Descriptions.Item>
            <Descriptions.Item label="SGST">{formatPaise(order.sgstPaise)}</Descriptions.Item>
            <Descriptions.Item label="IGST">{formatPaise(order.igstPaise)}</Descriptions.Item>
            <Descriptions.Item label="Total">
              <Typography.Text strong>{formatPaise(order.totalPaise)}</Typography.Text>
            </Descriptions.Item>
          </Descriptions>

          {order.events && order.events.length > 0 && (
            <>
              <Divider style={{ margin: '4px 0' }}>History</Divider>
              <Timeline
                items={order.events.map((e) => ({
                  color:
                    e.status === 'DELIVERED'
                      ? 'green'
                      : e.status === 'CANCELLED' || e.status === 'RETURNED'
                        ? 'red'
                        : 'blue',
                  children: (
                    <div>
                      <Tag color={STATUS_COLORS[e.status]}>{e.status}</Tag>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {dayjs(e.createdAt).format('DD MMM, h:mm a')}
                        {e.user ? ` · ${e.user.name}` : e.note ? ` · ${e.note}` : ''}
                      </Typography.Text>
                    </div>
                  ),
                }))}
              />
            </>
          )}

          {order.returns && order.returns.length > 0 && (
            <>
              <Divider style={{ margin: '4px 0' }}>Returns</Divider>
              {order.returns.map((r) => (
                <Space key={r.id} style={{ justifyContent: 'space-between', width: '100%' }}>
                  <span>
                    {r.returnNumber} · <Tag color={RETURN_COLORS[r.status]}>{r.status}</Tag>
                  </span>
                  <span>{formatPaise(r.refundAmountPaise)}</span>
                </Space>
              ))}
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Process refunds from the Returns page.
              </Typography.Text>
            </>
          )}

          {canCancel && (
            <>
              <Divider style={{ margin: '4px 0' }}>Danger zone</Divider>
              <Popconfirm
                title="Cancel this order?"
                description={
                  <Space direction="vertical" size={4} style={{ maxWidth: 280 }}>
                    <Typography.Text>
                      Items are restocked and any captured online payment is refunded via Razorpay.
                      This cannot be undone.
                    </Typography.Text>
                    <Input.TextArea
                      rows={2}
                      placeholder="Reason (optional)"
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                    />
                  </Space>
                }
                okText="Cancel order"
                okButtonProps={{ danger: true, loading: cancelOrder.isPending }}
                cancelText="Keep order"
                onConfirm={cancel}
              >
                <Button danger block>
                  Cancel order
                </Button>
              </Popconfirm>
              {order.paymentStatus === 'PAID' && (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {order.paymentMethod === 'RAZORPAY'
                    ? 'Paid online — the refund is issued automatically to the customer.'
                    : 'Marked paid — refund the customer manually; the order is set to REFUNDED.'}
                </Typography.Text>
              )}
            </>
          )}
        </Space>
      )}
      <ShipModal open={shipOpen} order={order ?? null} ship={shipOrder} book={bookShipment} onClose={() => setShipOpen(false)} />
    </Drawer>
  );
}

const RETURN_COLORS: Record<string, string> = {
  REQUESTED: 'gold',
  APPROVED: 'blue',
  REJECTED: 'red',
  REFUNDED: 'green',
  CANCELLED: 'default',
};

/** Records courier + AWB and flips the order to SHIPPED. */
function ShipModal({
  open,
  order,
  ship,
  book,
  onClose,
}: {
  open: boolean;
  order: Order | null;
  ship: ReturnType<typeof useShipOrder>;
  book: ReturnType<typeof useBookShipment>;
  onClose: () => void;
}) {
  const [form] = Form.useForm();
  if (!order) return null;
  const submit = async () => {
    const v = await form.validateFields();
    try {
      await ship.mutateAsync({
        id: order.id,
        courierName: v.courierName?.trim() || undefined,
        trackingNumber: v.trackingNumber?.trim() || undefined,
        trackingUrl: v.trackingUrl?.trim() || undefined,
      });
      message.success(`Order ${order.orderNumber} marked shipped`);
      form.resetFields();
      onClose();
    } catch (e) {
      message.error((e as Error).message ?? 'Failed to record shipment');
    }
  };
  const autoBook = async () => {
    try {
      const res = await book.mutateAsync(order.id);
      message.success(
        `Booked with ${res.order.courierName ?? 'courier'} · AWB ${res.order.trackingNumber}`,
      );
      if (res.labelUrl) window.open(res.labelUrl, '_blank', 'noopener');
      onClose();
    } catch (e) {
      message.error((e as Error).message ?? 'Courier booking failed');
    }
  };
  return (
    <Modal
      title={`Ship ${order.orderNumber}`}
      open={open}
      onCancel={onClose}
      destroyOnClose
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="book" onClick={autoBook} loading={book.isPending}>
          Book with courier
        </Button>,
        <Button key="ship" type="primary" onClick={submit} loading={ship.isPending}>
          Mark shipped
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          courierName: order.courierName ?? '',
          trackingNumber: order.trackingNumber ?? '',
          trackingUrl: order.trackingUrl ?? '',
        }}
      >
        <Form.Item name="courierName" label="Courier">
          <Input placeholder="e.g. Delhivery, Blue Dart" />
        </Form.Item>
        <Form.Item name="trackingNumber" label="AWB / Tracking number">
          <Input placeholder="Consignment number" />
        </Form.Item>
        <Form.Item name="trackingUrl" label="Tracking URL (optional)" rules={[{ type: 'url', message: 'Enter a valid URL' }]}>
          <Input placeholder="https://…" />
        </Form.Item>
      </Form>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        “Book with courier” auto-generates the AWB via your courier integration; otherwise fill the
        fields and Mark shipped.
      </Typography.Text>
    </Modal>
  );
}
