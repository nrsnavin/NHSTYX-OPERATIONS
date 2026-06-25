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
  Select,
  Space,
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
  assignAgent,
  createStore,
  importInventory,
  removeServiceArea,
  removeStoreProduct,
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
        <InventoryCard store={store} onChanged={onChanged} />
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

function InventoryCard({ store, onChanged }: { store: Store; onChanged: () => void }) {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { data, isLoading } = useStoreInventory(store.id, { page, limit: 8, search: search || undefined });

  const [editing, setEditing] = useState<StoreInventoryItem | null>(null);
  const [form] = Form.useForm<InvFormValues>();

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['store-inventory', store.id] });
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
    </Card>
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
