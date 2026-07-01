import { useState } from 'react';
import {
  Button,
  Card,
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
  Statistic,
  Switch,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { FormInstance } from 'antd/es/form';
import {
  EnvironmentOutlined,
  PlusOutlined,
  ShopOutlined,
  TeamOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  addServiceArea,
  adjustStock,
  assignAgent,
  createStore,
  importInventory,
  removeServiceArea,
  removeStoreProduct,
  stockTake,
  transferStock,
  unassignAgent,
  updateStore,
  upsertStoreProduct,
  useAgents,
  useStockMovements,
  useStoreInventory,
  useStores,
  type StockMovement,
  type StoreInput,
} from '../api/stores.api';
import { formatPaise } from '../lib/money';
import { useAuthStore } from '../store/auth.store';
import type { Store, StoreInventoryItem } from '../types';

const toPaise = (rupees: number | null | undefined) =>
  rupees == null ? undefined : Math.round(rupees * 100);

export function StoresPage() {
  const isAdmin = useAuthStore((s) => s.user?.role === 'ADMIN');
  const qc = useQueryClient();
  const { data: stores, isLoading } = useStores();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Store | null>(null);
  const [managing, setManaging] = useState<Store | null>(null);
  const [form] = Form.useForm<StoreInput>();

  const refreshStores = () => qc.invalidateQueries({ queryKey: ['stores'] });

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ state: 'Maharashtra', stateCode: '27', isActive: true } as StoreInput);
    setFormOpen(true);
  };
  const openEdit = (store: Store) => {
    setEditing(store);
    form.setFieldsValue(store as unknown as StoreInput);
    setFormOpen(true);
  };

  const submitStore = async () => {
    const values = await form.validateFields();
    try {
      if (editing) await updateStore(editing.id, values);
      else await createStore(values);
      message.success(editing ? 'Store updated' : 'Store created');
      setFormOpen(false);
      refreshStores();
    } catch (err) {
      message.error((err as Error).message ?? 'Failed to save store');
    }
  };

  const columns: ColumnsType<Store> = [
    {
      title: 'Store',
      key: 'name',
      render: (_, s) => (
        <div>
          <div style={{ fontWeight: 600 }}>
            {s.name} <Tag>{s.code}</Tag>
          </div>
          <Typography.Text type="secondary">
            {s.city}, {s.state} · GST {s.stateCode}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'Cities served',
      key: 'areas',
      render: (_, s) =>
        s.serviceAreas.length ? (
          <Space size={[4, 4]} wrap>
            {s.serviceAreas.slice(0, 3).map((a) => (
              <Tag key={a.id}>{a.label}</Tag>
            ))}
            {s.serviceAreas.length > 3 && <Tag>+{s.serviceAreas.length - 3}</Tag>}
          </Space>
        ) : (
          <Typography.Text type="secondary">None</Typography.Text>
        ),
    },
    {
      title: 'Agents',
      key: 'agents',
      render: (_, s) => s._count?.agents ?? 0,
    },
    {
      title: 'Products',
      key: 'inventory',
      render: (_, s) => s._count?.inventory ?? 0,
    },
    {
      title: 'Status',
      key: 'isActive',
      render: (_, s) => (s.isActive ? <Tag color="green">Active</Tag> : <Tag>Inactive</Tag>),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, s) => (
        <Space>
          <Button size="small" onClick={() => setManaging(s)}>
            Manage
          </Button>
          {isAdmin && (
            <Button size="small" type="link" onClick={() => openEdit(s)}>
              Edit
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Stores"
      extra={
        isAdmin && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            New store
          </Button>
        )
      }
    >
      <Table<Store>
        rowKey="id"
        loading={isLoading}
        columns={columns}
        dataSource={stores ?? []}
        pagination={false}
      />

      <Modal
        title={editing ? 'Edit store' : 'New store'}
        open={formOpen}
        onOk={submitStore}
        onCancel={() => setFormOpen(false)}
        okText={editing ? 'Save' : 'Create'}
        destroyOnClose
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item name="name" label="Store name" rules={[{ required: true, min: 2 }]}>
            <Input placeholder="NH Styx — Pune" />
          </Form.Item>
          <Space style={{ display: 'flex' }} align="start">
            <Form.Item
              name="code"
              label="Code"
              rules={[{ required: true }, { pattern: /^[A-Za-z0-9_-]+$/, message: 'Letters/digits only' }]}
            >
              <Input placeholder="PUN" style={{ width: 120 }} />
            </Form.Item>
            <Form.Item name="phone" label="Phone">
              <Input placeholder="90000 00000" />
            </Form.Item>
          </Space>
          <Form.Item name="addressLine" label="Address">
            <Input placeholder="Unit 4, Market Yard" />
          </Form.Item>
          <Space style={{ display: 'flex' }} align="start">
            <Form.Item name="city" label="City" rules={[{ required: true }]}>
              <Input placeholder="Pune" />
            </Form.Item>
            <Form.Item name="state" label="State" rules={[{ required: true }]}>
              <Input placeholder="Maharashtra" />
            </Form.Item>
          </Space>
          <Space style={{ display: 'flex' }} align="start">
            <Form.Item
              name="stateCode"
              label="GST state code"
              rules={[{ required: true }, { pattern: /^\d{2}$/, message: '2 digits' }]}
            >
              <Input placeholder="27" style={{ width: 100 }} />
            </Form.Item>
            <Form.Item name="pincode" label="PIN">
              <Input placeholder="411001" style={{ width: 120 }} />
            </Form.Item>
            <Form.Item name="isActive" label="Active" valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      {managing && (
        <ManageStoreDrawer
          store={managing}
          isAdmin={isAdmin}
          onClose={() => setManaging(null)}
          onChanged={refreshStores}
        />
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------

function ManageStoreDrawer({
  store,
  isAdmin,
  onClose,
  onChanged,
}: {
  store: Store;
  isAdmin: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  return (
    <Drawer
      title={
        <span>
          <ShopOutlined /> {store.name} <Tag>{store.code}</Tag>
        </span>
      }
      width={760}
      open
      onClose={onClose}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <ServiceAreasCard store={store} isAdmin={isAdmin} onChanged={onChanged} />
        <AgentsCard store={store} isAdmin={isAdmin} onChanged={onChanged} />
        <InventoryCard store={store} isAdmin={isAdmin} onChanged={onChanged} />
        <StockLedgerCard store={store} />
      </Space>
    </Drawer>
  );
}

function ServiceAreasCard({
  store,
  isAdmin,
  onChanged,
}: {
  store: Store;
  isAdmin: boolean;
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const [city, setCity] = useState('');
  const refresh = () => {
    onChanged();
    qc.invalidateQueries({ queryKey: ['stores'] });
  };

  const add = async () => {
    if (city.trim().length < 2) return;
    try {
      await addServiceArea(store.id, city.trim());
      setCity('');
      refresh();
    } catch (err) {
      message.error((err as Error).message ?? 'Could not add city');
    }
  };

  return (
    <Card size="small" title={<><EnvironmentOutlined /> Cities served</>}>
      <Space size={[6, 6]} wrap style={{ marginBottom: isAdmin ? 12 : 0 }}>
        {store.serviceAreas.length === 0 && (
          <Typography.Text type="secondary">No cities yet.</Typography.Text>
        )}
        {store.serviceAreas.map((a) =>
          isAdmin ? (
            <Popconfirm
              key={a.id}
              title={`Remove "${a.label}"?`}
              onConfirm={async () => {
                await removeServiceArea(a.id);
                refresh();
              }}
            >
              <Tag closable>{a.label}</Tag>
            </Popconfirm>
          ) : (
            <Tag key={a.id}>{a.label}</Tag>
          ),
        )}
      </Space>
      {isAdmin && (
        <Space.Compact style={{ width: '100%' }}>
          <Input
            placeholder="Add a city this store serves…"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onPressEnter={add}
          />
          <Button type="primary" onClick={add}>
            Add
          </Button>
        </Space.Compact>
      )}
    </Card>
  );
}

function AgentsCard({
  store,
  isAdmin,
  onChanged,
}: {
  store: Store;
  isAdmin: boolean;
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const { data: agents } = useAgents();
  const [selected, setSelected] = useState<string | undefined>();

  const refresh = () => {
    onChanged();
    qc.invalidateQueries({ queryKey: ['agents'] });
    qc.invalidateQueries({ queryKey: ['stores'] });
  };

  const assigned = (agents ?? []).filter((a) => a.storeId === store.id);
  const unassigned = (agents ?? []).filter((a) => !a.storeId);

  return (
    <Card size="small" title={<><TeamOutlined /> Agents</>}>
      <Space size={[6, 6]} wrap style={{ marginBottom: isAdmin ? 12 : 0 }}>
        {assigned.length === 0 && <Typography.Text type="secondary">No agents assigned.</Typography.Text>}
        {assigned.map((a) =>
          isAdmin ? (
            <Popconfirm
              key={a.id}
              title={`Unassign ${a.name}?`}
              onConfirm={async () => {
                await unassignAgent(a.id);
                refresh();
              }}
            >
              <Tag color="blue" closable>
                {a.name}
              </Tag>
            </Popconfirm>
          ) : (
            <Tag color="blue" key={a.id}>
              {a.name}
            </Tag>
          ),
        )}
      </Space>
      {isAdmin && (
        <Space.Compact style={{ width: '100%' }}>
          <Select
            style={{ flex: 1 }}
            placeholder="Assign an unassigned agent…"
            value={selected}
            onChange={setSelected}
            options={unassigned.map((a) => ({ value: a.id, label: `${a.name} (${a.email})` }))}
            notFoundContent="No unassigned agents"
          />
          <Button
            type="primary"
            disabled={!selected}
            onClick={async () => {
              await assignAgent(store.id, selected as string);
              setSelected(undefined);
              refresh();
            }}
          >
            Assign
          </Button>
        </Space.Compact>
      )}
    </Card>
  );
}

interface InvFormValues {
  price: number;
  mrp?: number | null;
  stock: number;
  reorderLevel?: number;
  reorderQty?: number;
  isActive: boolean;
  tiers?: { minQty: number; price: number }[];
}

/** Live "X% off MRP" hint under the price/MRP inputs in the pricing editor. */
function DiscountHint({ form }: { form: FormInstance<InvFormValues> }) {
  const price = Form.useWatch('price', form);
  const mrp = Form.useWatch('mrp', form);
  if (price == null || mrp == null) return null;
  if (mrp <= price) {
    return mrp < price ? (
      <Typography.Text type="warning" style={{ fontSize: 12 }}>
        MRP is below the selling price.
      </Typography.Text>
    ) : null;
  }
  const discount = Math.round(((mrp - price) / mrp) * 100);
  return (
    <Typography.Text type="success" style={{ fontSize: 12 }}>
      Customers see {discount}% off MRP.
    </Typography.Text>
  );
}

function InventoryCard({
  store,
  isAdmin,
  onChanged,
}: {
  store: Store;
  isAdmin: boolean;
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { data, isLoading } = useStoreInventory(store.id, { page, limit: 8, search: search || undefined });

  const [editing, setEditing] = useState<StoreInventoryItem | null>(null);
  const [adjusting, setAdjusting] = useState<StoreInventoryItem | null>(null);
  const [transferring, setTransferring] = useState<StoreInventoryItem | null>(null);
  const [takeOpen, setTakeOpen] = useState(false);
  const [form] = Form.useForm<InvFormValues>();

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['store-inventory', store.id] });
    qc.invalidateQueries({ queryKey: ['store-movements', store.id] });
    qc.invalidateQueries({ queryKey: ['stores'] });
    onChanged();
  };

  const openEdit = (item: StoreInventoryItem) => {
    setEditing(item);
    const sp = item.storeProduct;
    form.setFieldsValue({
      price: sp ? sp.pricePaise / 100 : undefined,
      mrp: sp?.mrpPaise != null ? sp.mrpPaise / 100 : item.mrpPaise != null ? item.mrpPaise / 100 : undefined,
      stock: sp?.stockQty ?? 0,
      reorderLevel: sp?.reorderLevel ?? 0,
      reorderQty: sp?.reorderQty ?? 0,
      isActive: sp?.isActive ?? true,
      tiers: (sp?.priceTiers ?? []).map((t) => ({ minQty: t.minQty, price: t.pricePaise / 100 })),
    } as InvFormValues);
  };

  const save = async () => {
    if (!editing) return;
    const v = await form.validateFields();
    try {
      await upsertStoreProduct(store.id, editing.productId, {
        pricePaise: toPaise(v.price)!,
        mrpPaise: toPaise(v.mrp ?? undefined) ?? null,
        stockQty: v.stock ?? 0,
        reorderLevel: v.reorderLevel ?? 0,
        reorderQty: v.reorderQty ?? 0,
        isActive: v.isActive,
        priceTiers: (v.tiers ?? []).map((t) => ({ minQty: t.minQty, pricePaise: toPaise(t.price)! })),
      });
      message.success(`${editing.name} updated for ${store.name}`);
      setEditing(null);
      refresh();
    } catch (err) {
      message.error((err as Error).message ?? 'Failed to save');
    }
  };

  const columns: ColumnsType<StoreInventoryItem> = [
    {
      title: 'Product',
      key: 'name',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.name}</div>
          <Typography.Text type="secondary">
            {r.categoryName ?? '—'} · {r.gstRatePercent}% GST · MOQ {r.moqQty}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'Price',
      key: 'price',
      render: (_, r) => {
        const sp = r.storeProduct;
        if (!sp) return <Typography.Text type="secondary">—</Typography.Text>;
        const mrp = sp.mrpPaise ?? r.mrpPaise ?? null;
        const discount =
          mrp != null && mrp > sp.pricePaise
            ? Math.round(((mrp - sp.pricePaise) / mrp) * 100)
            : null;
        return (
          <div>
            <Space size={6} wrap>
              <span style={{ fontWeight: 600 }}>{formatPaise(sp.pricePaise)}</span>
              {discount != null && (
                <>
                  <Typography.Text delete type="secondary" style={{ fontSize: 12 }}>
                    {formatPaise(mrp!)}
                  </Typography.Text>
                  <Tag color="green" style={{ marginInlineEnd: 0 }}>
                    {discount}% off
                  </Tag>
                </>
              )}
            </Space>
            {sp.priceTiers.length > 0 && (
              <div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {sp.priceTiers.length} tier(s)
                </Typography.Text>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Stock',
      key: 'stock',
      render: (_, r) =>
        !r.storeProduct ? (
          <Tag>Not stocked</Tag>
        ) : !r.storeProduct.isActive ? (
          <Tag>Delisted</Tag>
        ) : r.storeProduct.stockQty > 0 ? (
          r.storeProduct.stockQty
        ) : (
          <Tag color="red">Out</Tag>
        ),
    },
    {
      title: '',
      key: 'actions',
      align: 'right',
      render: (_, r) => (
        <Space>
          <Button size="small" type="link" onClick={() => openEdit(r)}>
            {r.stocked ? 'Edit' : 'Add'}
          </Button>
          {r.stocked && r.storeProduct?.isActive && (
            <Button size="small" type="link" onClick={() => setAdjusting(r)}>
              Adjust
            </Button>
          )}
          {isAdmin && r.stocked && r.storeProduct?.isActive && r.storeProduct.stockQty > 0 && (
            <Button size="small" type="link" onClick={() => setTransferring(r)}>
              Transfer
            </Button>
          )}
          {r.stocked && (
            <Popconfirm
              title="Remove from this store?"
              onConfirm={async () => {
                await removeStoreProduct(store.id, r.productId);
                refresh();
              }}
            >
              <Button size="small" type="link" danger>
                Remove
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card
      size="small"
      title="Inventory & pricing"
      extra={
        <Space>
          <Upload
            showUploadList={false}
            accept=".csv,text/csv"
            beforeUpload={async (file) => {
              try {
                const r = await importInventory(store.id, file as File);
                Modal.info({
                  title: 'CSV import complete',
                  content: (
                    <div>
                      <p>
                        Created {r.created} · Updated {r.updated} · Skipped {r.skipped}
                      </p>
                      {r.errors.length > 0 && (
                        <ul style={{ maxHeight: 160, overflow: 'auto', paddingLeft: 18 }}>
                          {r.errors.map((e, i) => (
                            <li key={i}>{e}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ),
                });
                refresh();
              } catch (e) {
                message.error((e as Error).message ?? 'Import failed');
              }
              return false;
            }}
          >
            <Button size="small" icon={<UploadOutlined />}>
              Import CSV
            </Button>
          </Upload>
          <Button size="small" onClick={() => setTakeOpen(true)}>
            Stock take
          </Button>
          <Input.Search
            placeholder="Search products…"
            allowClear
            onSearch={(v) => {
              setSearch(v);
              setPage(1);
            }}
            style={{ width: 200 }}
          />
        </Space>
      }
    >
      <Table<StoreInventoryItem>
        rowKey="productId"
        size="small"
        loading={isLoading}
        columns={columns}
        dataSource={data?.items ?? []}
        locale={{ emptyText: <Empty description="No catalog products" /> }}
        pagination={{
          current: page,
          pageSize: 8,
          total: data?.pagination.total ?? 0,
          onChange: setPage,
          showSizeChanger: false,
        }}
      />

      <Modal
        title={editing ? `${editing.stocked ? 'Edit' : 'Add'} — ${editing.name}` : ''}
        open={Boolean(editing)}
        onOk={save}
        onCancel={() => setEditing(null)}
        okText="Save"
        destroyOnClose
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Space style={{ display: 'flex' }} align="start">
            <Form.Item
              name="price"
              label="Price (₹, excl. GST)"
              rules={[{ required: true, type: 'number', min: 0 }]}
            >
              <InputNumber min={0} style={{ width: 160 }} />
            </Form.Item>
            <Form.Item name="mrp" label="MRP (₹)">
              <InputNumber min={0} style={{ width: 140 }} />
            </Form.Item>
            <Form.Item name="stock" label="Stock" rules={[{ required: true, type: 'number', min: 0 }]}>
              <InputNumber min={0} style={{ width: 120 }} />
            </Form.Item>
          </Space>
          <Space style={{ display: 'flex' }} align="start">
            <Form.Item name="reorderLevel" label="Reorder level" tooltip="Alert when stock falls to/below this (0 = off)">
              <InputNumber min={0} style={{ width: 160 }} placeholder="0 = no alert" />
            </Form.Item>
            <Form.Item name="reorderQty" label="Reorder qty" tooltip="Suggested quantity to put on a purchase order">
              <InputNumber min={0} style={{ width: 140 }} />
            </Form.Item>
          </Space>
          <DiscountHint form={form} />
          <Form.Item name="isActive" label="Listed in store" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>

          <Typography.Text type="secondary">Quantity-break tiers (optional)</Typography.Text>
          <Form.List name="tiers">
            {(fields, { add, remove }) => (
              <div style={{ marginTop: 8 }}>
                {fields.map((field) => (
                  <Space key={field.key} align="baseline" style={{ display: 'flex' }}>
                    <Form.Item
                      {...field}
                      name={[field.name, 'minQty']}
                      rules={[{ required: true, type: 'number', min: 1 }]}
                    >
                      <InputNumber min={1} placeholder="Min qty" style={{ width: 120 }} />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      name={[field.name, 'price']}
                      rules={[{ required: true, type: 'number', min: 0 }]}
                    >
                      <InputNumber min={0} placeholder="₹ / unit" style={{ width: 140 }} />
                    </Form.Item>
                    <Button type="link" danger onClick={() => remove(field.name)}>
                      Remove
                    </Button>
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                  Add tier
                </Button>
              </div>
            )}
          </Form.List>
        </Form>
      </Modal>

      <AdjustStockModal
        store={store}
        item={adjusting}
        onClose={() => setAdjusting(null)}
        onDone={refresh}
      />
      <TransferStockModal
        store={store}
        item={transferring}
        onClose={() => setTransferring(null)}
        onDone={refresh}
      />
      <StockTakeModal
        store={store}
        open={takeOpen}
        onClose={() => setTakeOpen(false)}
        onDone={refresh}
      />
    </Card>
  );
}

interface TransferFormValues {
  toStoreId: string;
  quantity: number;
  reason?: string;
}

/** Move a product's stock from this store to another (admin). */
function TransferStockModal({
  store,
  item,
  onClose,
  onDone,
}: {
  store: Store;
  item: StoreInventoryItem | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const { data: stores } = useStores();
  const [form] = Form.useForm<TransferFormValues>();
  const [saving, setSaving] = useState(false);
  const available = item?.storeProduct?.stockQty ?? 0;
  const destinations = (stores ?? []).filter((s) => s.id !== store.id);

  const submit = async () => {
    if (!item) return;
    const v = await form.validateFields();
    setSaving(true);
    try {
      const res = await transferStock(store.id, {
        toStoreId: v.toStoreId,
        productId: item.productId,
        quantity: v.quantity,
        reason: v.reason?.trim() || undefined,
      });
      message.success(
        `Moved ${res.quantity} × ${res.productName} to ${res.to.name}` +
          (res.createdDestination ? ' (added to that store)' : ''),
      );
      onClose();
      onDone();
    } catch (e) {
      message.error((e as Error).message ?? 'Transfer failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={item ? `Transfer stock — ${item.name}` : ''}
      open={Boolean(item)}
      onOk={submit}
      confirmLoading={saving}
      onCancel={onClose}
      okText="Transfer"
      afterOpenChange={(o) => {
        if (o) form.setFieldsValue({ toStoreId: undefined as unknown as string, quantity: 1, reason: undefined });
      }}
      destroyOnClose
    >
      <Typography.Paragraph type="secondary">
        {available} in stock at {store.name}.
      </Typography.Paragraph>
      <Form form={form} layout="vertical" requiredMark="optional">
        <Form.Item name="toStoreId" label="Destination store" rules={[{ required: true, message: 'Pick a store' }]}>
          <Select
            placeholder="Move stock to…"
            options={destinations.map((s) => ({ value: s.id, label: `${s.name} · ${s.city}` }))}
            notFoundContent="No other stores"
          />
        </Form.Item>
        <Form.Item
          name="quantity"
          label="Quantity"
          rules={[
            { required: true, type: 'number', min: 1 },
            { type: 'number', max: available, message: `Only ${available} available` },
          ]}
        >
          <InputNumber min={1} max={available} style={{ width: 180 }} autoFocus />
        </Form.Item>
        <Form.Item name="reason" label="Reason">
          <Input placeholder="e.g. Rebalancing stock" maxLength={200} />
        </Form.Item>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          If the destination doesn't stock this product, it's added there at this store's price.
        </Typography.Text>
      </Form>
    </Modal>
  );
}

interface AdjustFormValues {
  action: 'add' | 'remove' | 'set';
  quantity: number;
  reason?: string;
}

/** Single-product stock correction (add / remove / set) with a ledger reason. */
function AdjustStockModal({
  store,
  item,
  onClose,
  onDone,
}: {
  store: Store;
  item: StoreInventoryItem | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [form] = Form.useForm<AdjustFormValues>();
  const [saving, setSaving] = useState(false);
  const current = item?.storeProduct?.stockQty ?? 0;
  const action = Form.useWatch('action', form) ?? 'add';
  const quantity = Form.useWatch('quantity', form) ?? 0;
  const projected =
    action === 'set' ? quantity : action === 'remove' ? current - quantity : current + quantity;

  const submit = async () => {
    if (!item) return;
    const v = await form.validateFields();
    const mode = v.action === 'set' ? 'set' : 'delta';
    const signed = v.action === 'remove' ? -v.quantity : v.quantity;
    setSaving(true);
    try {
      const res = await adjustStock(store.id, item.productId, {
        mode,
        quantity: mode === 'set' ? v.quantity : signed,
        reason: v.reason?.trim() || undefined,
      });
      message.success(
        res.delta === 0
          ? 'No change — stock already matched'
          : `${item.name}: ${res.before} → ${res.after} (${res.delta > 0 ? '+' : ''}${res.delta})`,
      );
      onClose();
      onDone();
    } catch (e) {
      message.error((e as Error).message ?? 'Adjustment failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={item ? `Adjust stock — ${item.name}` : ''}
      open={Boolean(item)}
      onOk={submit}
      confirmLoading={saving}
      onCancel={onClose}
      okText="Apply adjustment"
      afterOpenChange={(o) => {
        if (o) form.setFieldsValue({ action: 'add', quantity: 1, reason: undefined });
      }}
      destroyOnClose
    >
      <Space size="large" style={{ marginBottom: 12 }}>
        <Statistic title="Current stock" value={current} />
        <Statistic
          title="After adjustment"
          value={projected}
          valueStyle={{ color: projected < 0 ? '#cf1322' : projected !== current ? '#3f8600' : undefined }}
        />
      </Space>
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item name="action" initialValue="add">
          <Radio.Group
            optionType="button"
            buttonStyle="solid"
            options={[
              { label: 'Add', value: 'add' },
              { label: 'Remove', value: 'remove' },
              { label: 'Set to', value: 'set' },
            ]}
          />
        </Form.Item>
        <Form.Item
          name="quantity"
          label={action === 'set' ? 'New counted quantity' : 'Quantity'}
          rules={[{ required: true, type: 'number', min: action === 'set' ? 0 : 1 }]}
        >
          <InputNumber min={0} style={{ width: 180 }} autoFocus />
        </Form.Item>
        <Form.Item
          name="reason"
          label="Reason"
          tooltip="Recorded on the stock ledger (e.g. damaged, shrinkage, found stock, count correction)"
        >
          <Input placeholder="e.g. Damaged in storage" maxLength={200} />
        </Form.Item>
        {projected < 0 && (
          <Typography.Text type="danger">Stock can't go below zero.</Typography.Text>
        )}
      </Form>
    </Modal>
  );
}

interface CountRow {
  productId: string;
  name: string;
  system: number;
  counted: number;
}

/** Bulk physical count — enter counted quantities; differences post as ADJUSTMENTs. */
function StockTakeModal({
  store,
  open,
  onClose,
  onDone,
}: {
  store: Store;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useStoreInventory(open ? store.id : null, { limit: 100, search: search || undefined });
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  const rows: CountRow[] = (data?.items ?? [])
    .filter((i) => i.stocked && i.storeProduct?.isActive)
    .map((i) => {
      const system = i.storeProduct?.stockQty ?? 0;
      return { productId: i.productId, name: i.name, system, counted: counts[i.productId] ?? system };
    });
  const changed = rows.filter((r) => r.counted !== r.system);

  const submit = async () => {
    if (changed.length === 0) {
      message.info('No differences to record');
      return;
    }
    setSaving(true);
    try {
      const res = await stockTake(
        store.id,
        changed.map((r) => ({ productId: r.productId, countedQty: r.counted })),
      );
      message.success(`Stock take complete — ${res.adjusted} product(s) adjusted`);
      setCounts({});
      onClose();
      onDone();
    } catch (e) {
      message.error((e as Error).message ?? 'Stock take failed');
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<CountRow> = [
    { title: 'Product', dataIndex: 'name', key: 'name' },
    { title: 'System', dataIndex: 'system', key: 'system', width: 90 },
    {
      title: 'Counted',
      key: 'counted',
      width: 120,
      render: (_, r) => (
        <InputNumber
          min={0}
          value={r.counted}
          onChange={(v) => setCounts((c) => ({ ...c, [r.productId]: Number(v ?? 0) }))}
          style={{ width: 100 }}
        />
      ),
    },
    {
      title: 'Δ',
      key: 'delta',
      width: 80,
      render: (_, r) => {
        const d = r.counted - r.system;
        return d === 0 ? (
          <Typography.Text type="secondary">—</Typography.Text>
        ) : (
          <Tag color={d < 0 ? 'red' : 'green'}>{d > 0 ? `+${d}` : d}</Tag>
        );
      },
    },
  ];

  return (
    <Modal
      title={`Stock take — ${store.name}`}
      open={open}
      onOk={submit}
      confirmLoading={saving}
      onCancel={onClose}
      okText={changed.length ? `Record ${changed.length} change(s)` : 'Record'}
      okButtonProps={{ disabled: changed.length === 0 }}
      width={640}
      destroyOnClose
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Input.Search placeholder="Search products…" allowClear onSearch={setSearch} />
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Enter the physical count for each product. Only products whose count differs are recorded
          as adjustments on the ledger.
        </Typography.Text>
        <Table<CountRow>
          rowKey="productId"
          size="small"
          loading={isLoading}
          columns={columns}
          dataSource={rows}
          locale={{ emptyText: <Empty description="No stocked products" /> }}
          pagination={false}
          scroll={{ y: 360 }}
        />
      </Space>
    </Modal>
  );
}

function StockLedgerCard({ store }: { store: Store }) {
  const { data, isLoading } = useStockMovements(store.id, { limit: 30 });
  const columns: ColumnsType<StockMovement> = [
    {
      title: 'When',
      dataIndex: 'createdAt',
      key: 'when',
      render: (d: string) =>
        new Date(d).toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }),
    },
    { title: 'Product', key: 'product', render: (_, m) => m.product?.name ?? '—' },
    {
      title: 'Change',
      dataIndex: 'deltaQty',
      key: 'delta',
      render: (q: number) => <Tag color={q < 0 ? 'red' : 'green'}>{q > 0 ? `+${q}` : q}</Tag>,
    },
    { title: 'Type', dataIndex: 'type', key: 'type', render: (t: string) => <Tag>{t}</Tag> },
    { title: 'Ref', key: 'ref', render: (_, m) => m.order?.orderNumber ?? m.reason ?? '—' },
    { title: 'By', key: 'by', render: (_, m) => m.user?.name ?? 'system' },
  ];
  return (
    <Card size="small" title="Stock ledger">
      <Table<StockMovement>
        rowKey="id"
        size="small"
        loading={isLoading}
        columns={columns}
        dataSource={data?.items ?? []}
        pagination={{ pageSize: 8, size: 'small' }}
      />
    </Card>
  );
}
