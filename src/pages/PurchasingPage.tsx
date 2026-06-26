import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Divider,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { MinusCircleOutlined, PlusOutlined, WarningOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useQueryClient } from '@tanstack/react-query';
import {
  createPurchaseOrder,
  createSupplier,
  receivePurchaseOrder,
  setPurchaseOrderStatus,
  updatePurchaseOrder,
  updateSupplier,
  useLowStock,
  usePurchaseOrder,
  usePurchaseOrders,
  useSuppliers,
} from '../api/purchasing.api';
import { useStores } from '../api/stores.api';
import { useProducts } from '../api/products.api';
import { useAuthStore } from '../store/auth.store';
import { formatPaise } from '../lib/money';
import type {
  LowStockItem,
  PurchaseOrder,
  PurchaseOrderStatus,
  Supplier,
} from '../types';

const PO_STATUSES: PurchaseOrderStatus[] = ['DRAFT', 'ORDERED', 'PARTIAL', 'RECEIVED', 'CANCELLED'];
const PO_STATUS_COLOR: Record<PurchaseOrderStatus, string> = {
  DRAFT: 'default',
  ORDERED: 'blue',
  PARTIAL: 'gold',
  RECEIVED: 'green',
  CANCELLED: 'red',
};

interface PoPrefill {
  storeId?: string;
  lines: { productId: string; productName: string; orderedQty: number; unitCost: number }[];
}

export function PurchasingPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PurchaseOrder | null>(null);
  const [prefill, setPrefill] = useState<PoPrefill | null>(null);
  const [tab, setTab] = useState('low');

  const openNew = (pf: PoPrefill | null) => {
    setEditing(null);
    setPrefill(pf);
    setFormOpen(true);
  };
  const openEdit = (po: PurchaseOrder) => {
    setEditing(po);
    setPrefill(null);
    setFormOpen(true);
  };

  return (
    <Card title="Purchasing">
      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          {
            key: 'low',
            label: 'Low stock',
            children: (
              <LowStockTab
                onCreatePo={(pf) => {
                  openNew(pf);
                  setTab('po');
                }}
              />
            ),
          },
          {
            key: 'po',
            label: 'Purchase orders',
            children: <PurchaseOrdersTab onOpen={setSelected} onNew={() => openNew(null)} />,
          },
          { key: 'sup', label: 'Suppliers', children: <SuppliersTab /> },
        ]}
      />

      <PurchaseOrderFormModal
        open={formOpen}
        editing={editing}
        prefill={prefill}
        onClose={() => setFormOpen(false)}
        onSaved={() => setFormOpen(false)}
      />
      <PurchaseOrderDrawer id={selected} onClose={() => setSelected(null)} onEdit={openEdit} />
    </Card>
  );
}

// ---- Low stock --------------------------------------------------------------

function LowStockTab({ onCreatePo }: { onCreatePo: (pf: PoPrefill) => void }) {
  const { data, isLoading } = useLowStock();
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  const rows = data ?? [];
  const keyOf = (r: LowStockItem) => `${r.storeId}:${r.productId}`;

  const toPrefill = (items: LowStockItem[]): PoPrefill => ({
    storeId: items[0]?.storeId,
    lines: items.map((r) => ({
      productId: r.productId,
      productName: r.name,
      orderedQty: r.suggestedQty,
      unitCost: 0,
    })),
  });

  const createFromSelected = () => {
    const picked = rows.filter((r) => selectedKeys.includes(keyOf(r)));
    if (!picked.length) return;
    if (new Set(picked.map((r) => r.storeId)).size > 1) {
      message.warning('Select items from a single store to raise one purchase order');
      return;
    }
    onCreatePo(toPrefill(picked));
    setSelectedKeys([]);
  };

  const columns: ColumnsType<LowStockItem> = [
    {
      title: 'Product',
      key: 'name',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.name}</div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {r.brand ? `${r.brand} · ` : ''}
            {r.storeName}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'Stock',
      key: 'stock',
      render: (_, r) => (
        <Tag color={r.stockQty === 0 ? 'red' : 'orange'} icon={<WarningOutlined />}>
          {r.stockQty} / {r.reorderLevel}
        </Tag>
      ),
    },
    { title: 'Suggested', dataIndex: 'suggestedQty', key: 'sug' },
    {
      title: '',
      key: 'action',
      align: 'right',
      render: (_, r) => (
        <Button size="small" type="link" onClick={() => onCreatePo(toPrefill([r]))}>
          Order
        </Button>
      ),
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 12, justifyContent: 'space-between', width: '100%' }}>
        <Typography.Text type="secondary">
          Products at or below their reorder level. Set levels from a store's inventory editor.
        </Typography.Text>
        <Button type="primary" disabled={!selectedKeys.length} onClick={createFromSelected}>
          Create PO from selected ({selectedKeys.length})
        </Button>
      </Space>
      <Table<LowStockItem>
        rowKey={keyOf}
        size="small"
        loading={isLoading}
        columns={columns}
        dataSource={rows}
        rowSelection={{ selectedRowKeys: selectedKeys, onChange: (k) => setSelectedKeys(k as string[]) }}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        locale={{ emptyText: 'Nothing low on stock 🎉' }}
      />
    </>
  );
}

// ---- Purchase orders list ---------------------------------------------------

function PurchaseOrdersTab({ onOpen, onNew }: { onOpen: (id: string) => void; onNew: () => void }) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<PurchaseOrderStatus | undefined>();
  const [search, setSearch] = useState('');
  const { data, isLoading } = usePurchaseOrders({ page, limit: 10, status, search: search || undefined });

  const columns: ColumnsType<PurchaseOrder> = [
    {
      title: 'PO #',
      key: 'po',
      render: (_, po) => (
        <Button type="link" style={{ padding: 0 }} onClick={() => onOpen(po.id)}>
          <Typography.Text strong>{po.poNumber}</Typography.Text>
        </Button>
      ),
    },
    { title: 'Supplier', key: 'supplier', render: (_, po) => po.supplier?.name ?? '—' },
    {
      title: 'Store',
      key: 'store',
      render: (_, po) => (po.store ? <Tag color="blue">{po.store.city}</Tag> : '—'),
    },
    { title: 'Items', key: 'items', render: (_, po) => po.items.length },
    { title: 'Cost', key: 'cost', render: (_, po) => formatPaise(po.totalCostPaise) },
    {
      title: 'Status',
      key: 'status',
      render: (_, po) => <Tag color={PO_STATUS_COLOR[po.status]}>{po.status}</Tag>,
    },
    { title: 'Created', key: 'created', render: (_, po) => dayjs(po.createdAt).format('DD MMM') },
  ];

  return (
    <>
      <Space style={{ marginBottom: 12, justifyContent: 'space-between', width: '100%' }} wrap>
        <Space wrap>
          <Button type={status === undefined ? 'primary' : 'default'} onClick={() => { setStatus(undefined); setPage(1); }}>
            All
          </Button>
          {PO_STATUSES.map((s) => (
            <Button key={s} type={status === s ? 'primary' : 'default'} onClick={() => { setStatus(s); setPage(1); }}>
              {s}
            </Button>
          ))}
        </Space>
        <Space>
          <Input.Search
            placeholder="PO # / supplier…"
            allowClear
            onSearch={(v) => { setSearch(v); setPage(1); }}
            style={{ width: 200 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={onNew}>
            New PO
          </Button>
        </Space>
      </Space>
      <Table<PurchaseOrder>
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
    </>
  );
}

// ---- PO build / edit modal --------------------------------------------------

function PurchaseOrderFormModal({
  open,
  editing,
  prefill,
  onClose,
  onSaved,
}: {
  open: boolean;
  editing: PurchaseOrder | null;
  prefill: PoPrefill | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const me = useAuthStore((s) => s.user);
  const isAdmin = me?.role === 'ADMIN';
  const [prodSearch, setProdSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: suppliers } = useSuppliers({ activeOnly: true });
  const { data: stores } = useStores();
  const { data: products } = useProducts({ search: prodSearch || undefined, limit: 30 });

  const isEdit = Boolean(editing);

  const productOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of products?.items ?? []) map.set(p.id, `${p.name}${p.brand ? ` · ${p.brand}` : ''}`);
    for (const it of editing?.items ?? []) if (!map.has(it.productId)) map.set(it.productId, it.productName);
    for (const l of prefill?.lines ?? []) if (!map.has(l.productId)) map.set(l.productId, l.productName);
    return [...map].map(([value, label]) => ({ value, label }));
  }, [products, editing, prefill]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.setFieldsValue({
        storeId: editing.store?.id,
        supplierId: editing.supplier?.id,
        notes: editing.notes ?? undefined,
        expectedAt: editing.expectedAt ? dayjs(editing.expectedAt) : undefined,
        items: editing.items.map((i) => ({
          productId: i.productId,
          orderedQty: i.orderedQty,
          unitCost: i.unitCostPaise / 100,
        })),
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        storeId: prefill?.storeId,
        items:
          prefill?.lines.map((l) => ({ productId: l.productId, orderedQty: l.orderedQty, unitCost: l.unitCost })) ?? [{}],
      });
    }
  }, [open, editing, prefill, form]);

  const submit = async () => {
    const v = await form.validateFields();
    setSubmitting(true);
    try {
      const items = (v.items ?? []).map((it: { productId: string; orderedQty: number; unitCost?: number }) => ({
        productId: it.productId,
        orderedQty: it.orderedQty,
        unitCostPaise: it.unitCost != null ? Math.round(it.unitCost * 100) : 0,
      }));
      if (editing) {
        await updatePurchaseOrder(editing.id, {
          supplierId: v.supplierId,
          notes: v.notes || undefined,
          expectedAt: v.expectedAt ? v.expectedAt.toISOString() : null,
          items,
        });
        message.success('Purchase order updated');
      } else {
        await createPurchaseOrder({
          storeId: isAdmin ? v.storeId : undefined,
          supplierId: v.supplierId,
          notes: v.notes || undefined,
          expectedAt: v.expectedAt ? v.expectedAt.toISOString() : null,
          items,
        });
        message.success('Purchase order created');
      }
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      form.resetFields();
      onSaved();
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? (e as Error).message ?? 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={isEdit ? `Edit ${editing?.poNumber}` : 'New purchase order'}
      open={open}
      onOk={submit}
      confirmLoading={submitting}
      onCancel={onClose}
      okText={isEdit ? 'Save changes' : 'Create PO'}
      width={680}
    >
      <Form form={form} layout="vertical">
        <Space style={{ display: 'flex' }} align="start">
          {isAdmin && !isEdit && (
            <Form.Item name="storeId" label="Store" rules={[{ required: true, message: 'Pick a store' }]}>
              <Select
                style={{ width: 220 }}
                placeholder="Receiving store"
                options={(stores ?? []).map((s) => ({ value: s.id, label: `${s.name} · ${s.city}` }))}
              />
            </Form.Item>
          )}
          <Form.Item name="supplierId" label="Supplier" rules={[{ required: true, message: 'Pick a supplier' }]}>
            <Select
              style={{ width: 240 }}
              placeholder="Supplier"
              options={(suppliers ?? []).map((s) => ({ value: s.id, label: s.name }))}
            />
          </Form.Item>
          <Form.Item name="expectedAt" label="Expected">
            <DatePicker format="DD MMM YYYY" style={{ width: 150 }} />
          </Form.Item>
        </Space>

        <div style={{ marginBottom: 8, fontWeight: 600 }}>Items</div>
        <Form.List name="items" initialValue={[{}]}>
          {(fields, { add, remove }) => (
            <>
              {fields.map((field) => (
                <Space key={field.key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                  <Form.Item
                    name={[field.name, 'productId']}
                    rules={[{ required: true, message: 'Pick a product' }]}
                    style={{ minWidth: 300 }}
                  >
                    <Select showSearch filterOption={false} onSearch={setProdSearch} placeholder="Search product" options={productOptions} />
                  </Form.Item>
                  <Form.Item name={[field.name, 'orderedQty']} rules={[{ required: true, type: 'number', min: 1 }]}>
                    <InputNumber min={1} placeholder="Qty" style={{ width: 80 }} />
                  </Form.Item>
                  <Form.Item name={[field.name, 'unitCost']} tooltip="Buy cost per unit">
                    <InputNumber min={0} prefix="₹" placeholder="Unit cost" style={{ width: 130 }} />
                  </Form.Item>
                  {fields.length > 1 && <MinusCircleOutlined onClick={() => remove(field.name)} />}
                </Space>
              ))}
              <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} block>
                Add item
              </Button>
            </>
          )}
        </Form.List>

        <Form.Item name="notes" label="Notes" style={{ marginTop: 16 }}>
          <Input.TextArea rows={2} placeholder="Delivery instructions, terms…" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// ---- PO detail drawer (+ receive) -------------------------------------------

function PurchaseOrderDrawer({
  id,
  onClose,
  onEdit,
}: {
  id: string | null;
  onClose: () => void;
  onEdit: (po: PurchaseOrder) => void;
}) {
  const qc = useQueryClient();
  const { data: po, isLoading } = usePurchaseOrder(id);
  const [receiving, setReceiving] = useState(false);
  const [busy, setBusy] = useState(false);

  const reload = () => {
    qc.invalidateQueries({ queryKey: ['purchase-order', id] });
    qc.invalidateQueries({ queryKey: ['purchase-orders'] });
    qc.invalidateQueries({ queryKey: ['low-stock'] });
  };

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      message.success(ok);
      reload();
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? (e as Error).message ?? 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const isOpenForReceiving = po ? ['ORDERED', 'PARTIAL'].includes(po.status) : false;

  return (
    <Drawer
      title={po ? po.poNumber : 'Purchase order'}
      width={580}
      open={Boolean(id)}
      onClose={onClose}
      loading={isLoading}
    >
      {po && (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Space wrap>
            <Tag color={PO_STATUS_COLOR[po.status]}>{po.status}</Tag>
            {po.store && <Tag color="blue">{po.store.city}</Tag>}
          </Space>

          <Descriptions size="small" column={1} bordered>
            <Descriptions.Item label="Supplier">{po.supplier?.name ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Store">{po.store?.name ?? '—'}</Descriptions.Item>
            {po.expectedAt && (
              <Descriptions.Item label="Expected">{dayjs(po.expectedAt).format('DD MMM YYYY')}</Descriptions.Item>
            )}
            <Descriptions.Item label="Total cost">{formatPaise(po.totalCostPaise)}</Descriptions.Item>
          </Descriptions>

          <Table
            size="small"
            rowKey="id"
            pagination={false}
            dataSource={po.items}
            columns={[
              {
                title: 'Item',
                key: 'item',
                render: (_, it) => (
                  <span>
                    {it.productName}
                    {it.variantName ? <Typography.Text type="secondary"> · {it.variantName}</Typography.Text> : null}
                  </span>
                ),
              },
              {
                title: 'Recv / Ord',
                key: 'qty',
                width: 96,
                render: (_, it) => (
                  <Tag color={it.receivedQty >= it.orderedQty ? 'green' : it.receivedQty > 0 ? 'gold' : 'default'}>
                    {it.receivedQty} / {it.orderedQty}
                  </Tag>
                ),
              },
              { title: 'Cost', key: 'cost', width: 90, render: (_, it) => formatPaise(it.lineCostPaise) },
            ]}
          />

          {po.notes && <Alert type="info" message={po.notes} style={{ whiteSpace: 'pre-wrap' }} />}

          <Divider style={{ margin: '4px 0' }} />
          <Space wrap>
            {po.status === 'DRAFT' && (
              <>
                <Button onClick={() => onEdit(po)}>Edit</Button>
                <Button type="primary" ghost loading={busy} onClick={() => act(() => setPurchaseOrderStatus(po.id, 'ORDERED'), 'Marked ordered')}>
                  Mark ordered
                </Button>
              </>
            )}
            {isOpenForReceiving && (
              <Button type="primary" onClick={() => setReceiving(true)}>
                Receive goods
              </Button>
            )}
            {po.status !== 'RECEIVED' && po.status !== 'CANCELLED' && (
              <Button danger loading={busy} onClick={() => act(() => setPurchaseOrderStatus(po.id, 'CANCELLED'), 'Cancelled')}>
                Cancel PO
              </Button>
            )}
          </Space>
        </Space>
      )}

      {po && <ReceiveModal po={po} open={receiving} onClose={() => setReceiving(false)} onReceived={reload} />}
    </Drawer>
  );
}

function ReceiveModal({
  po,
  open,
  onClose,
  onReceived,
}: {
  po: PurchaseOrder;
  open: boolean;
  onClose: () => void;
  onReceived: () => void;
}) {
  const [form] = Form.useForm();
  const [busy, setBusy] = useState(false);
  const pending = po.items.filter((i) => i.receivedQty < i.orderedQty);

  useEffect(() => {
    if (open) {
      form.setFieldsValue(
        Object.fromEntries(pending.map((i) => [i.id, i.orderedQty - i.receivedQty])),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = async () => {
    const v = await form.validateFields();
    const lines = pending
      .map((i) => ({ itemId: i.id, receiveQty: Number(v[i.id] ?? 0) }))
      .filter((l) => l.receiveQty > 0);
    if (!lines.length) {
      message.warning('Enter a quantity to receive');
      return;
    }
    setBusy(true);
    try {
      await receivePurchaseOrder(po.id, lines);
      message.success('Goods received — stock updated');
      onReceived();
      onClose();
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? (e as Error).message ?? 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`Receive — ${po.poNumber}`} open={open} onOk={submit} confirmLoading={busy} onCancel={onClose} okText="Receive into stock">
      <Form form={form} layout="vertical">
        {pending.length === 0 ? (
          <Typography.Text type="secondary">All items already received.</Typography.Text>
        ) : (
          pending.map((i) => (
            <Form.Item
              key={i.id}
              name={i.id}
              label={`${i.productName}${i.variantName ? ` · ${i.variantName}` : ''} (remaining ${i.orderedQty - i.receivedQty})`}
              rules={[{ type: 'number', min: 0, max: i.orderedQty - i.receivedQty, message: `0–${i.orderedQty - i.receivedQty}` }]}
            >
              <InputNumber min={0} max={i.orderedQty - i.receivedQty} style={{ width: 140 }} />
            </Form.Item>
          ))
        )}
      </Form>
    </Modal>
  );
}

// ---- Suppliers --------------------------------------------------------------

function SuppliersTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const { data, isLoading } = useSuppliers({ search: search || undefined });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form] = Form.useForm();

  const refresh = () => qc.invalidateQueries({ queryKey: ['suppliers'] });

  const openModal = (s: Supplier | null) => {
    setEditing(s);
    form.resetFields();
    if (s) form.setFieldsValue({ name: s.name, phone: s.phone, email: s.email, gstin: s.gstin, addressLine: s.addressLine });
    setOpen(true);
  };

  const submit = async () => {
    const v = await form.validateFields();
    try {
      if (editing) await updateSupplier(editing.id, v);
      else await createSupplier(v);
      message.success(editing ? 'Supplier updated' : 'Supplier added');
      setOpen(false);
      refresh();
    } catch (e) {
      message.error((e as Error).message ?? 'Failed');
    }
  };

  const columns: ColumnsType<Supplier> = [
    { title: 'Name', dataIndex: 'name', key: 'name', render: (n: string) => <Typography.Text strong>{n}</Typography.Text> },
    { title: 'Phone', dataIndex: 'phone', key: 'phone', render: (p?: string) => p ?? '—' },
    { title: 'GSTIN', dataIndex: 'gstin', key: 'gstin', render: (g?: string) => g ?? '—' },
    {
      title: 'Active',
      key: 'active',
      render: (_, s) => <Tag color={s.isActive ? 'green' : 'default'}>{s.isActive ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: '',
      key: 'action',
      align: 'right',
      render: (_, s) => (
        <Space>
          <Button size="small" type="link" onClick={() => openModal(s)}>
            Edit
          </Button>
          <Button size="small" type="link" danger={s.isActive} onClick={() => updateSupplier(s.id, { isActive: !s.isActive }).then(refresh)}>
            {s.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 12, justifyContent: 'space-between', width: '100%' }}>
        <Input.Search placeholder="Search suppliers…" allowClear onSearch={setSearch} style={{ width: 220 }} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal(null)}>
          New supplier
        </Button>
      </Space>
      <Table<Supplier>
        rowKey="id"
        size="small"
        loading={isLoading}
        columns={columns}
        dataSource={data ?? []}
        pagination={{ pageSize: 10, showSizeChanger: false }}
      />

      <Modal title={editing ? 'Edit supplier' : 'New supplier'} open={open} onOk={submit} onCancel={() => setOpen(false)} okText="Save" destroyOnClose>
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item name="name" label="Name" rules={[{ required: true, min: 2 }]}>
            <Input placeholder="Acme Textiles Pvt Ltd" />
          </Form.Item>
          <Space style={{ display: 'flex' }} align="start">
            <Form.Item name="phone" label="Phone">
              <Input placeholder="9876543210" />
            </Form.Item>
            <Form.Item name="gstin" label="GSTIN">
              <Input placeholder="27ABCDE1234F1Z5" />
            </Form.Item>
          </Space>
          <Form.Item name="email" label="Email">
            <Input placeholder="sales@acme.com" />
          </Form.Item>
          <Form.Item name="addressLine" label="Address">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
