import { useState } from 'react';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Divider,
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
import { PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  createProduct,
  deleteProduct,
  updateProduct,
  uploadImage,
  useProducts,
  type ProductInput,
} from '../api/products.api';
import { createCategory, useCategoriesFlat } from '../api/categories.api';
import { useAuthStore } from '../store/auth.store';
import type { Product, ProductUnit } from '../types';

const UNITS: ProductUnit[] = ['PIECE', 'DOZEN', 'PACK', 'BOX', 'SET', 'KILOGRAM', 'METER'];
const GST_SLABS = [0, 5, 12, 18, 28];

interface FormValues {
  name: string;
  brand?: string;
  categoryId: string;
  tags?: string[];
  unit: ProductUnit;
  hsnCode?: string;
  gstRatePercent: number;
  mrp?: number; // rupees
  moqQty: number;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
}

export function ProductsPage() {
  const role = useAuthStore((s) => s.user?.role);
  const isAdmin = role === 'ADMIN';
  // Admins and agents can add/edit catalog products; only admins delete.
  const canEditCatalog = role === 'ADMIN' || role === 'AGENT';
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { data, isLoading } = useProducts({ page, limit: 10, search: search || undefined });
  const { data: categories } = useCategoriesFlat();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);
  const [form] = Form.useForm<FormValues>();
  const refresh = () => qc.invalidateQueries({ queryKey: ['products'] });

  // Inline "add category" from the product form's category dropdown.
  const [newCat, setNewCat] = useState('');
  const [addingCat, setAddingCat] = useState(false);
  const addCategory = async () => {
    const name = newCat.trim();
    if (name.length < 2) return;
    setAddingCat(true);
    try {
      const created = await createCategory({ name });
      await qc.invalidateQueries({ queryKey: ['categories-flat'] });
      form.setFieldsValue({ categoryId: created.id } as Partial<FormValues>);
      setNewCat('');
      message.success(`Category "${created.name}" added`);
    } catch (err) {
      message.error((err as Error).message ?? 'Failed to add category');
    } finally {
      setAddingCat(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ unit: 'PIECE', gstRatePercent: 5, moqQty: 1, isActive: true } as FormValues);
    setOpen(true);
  };
  const openEdit = (p: Product) => {
    setEditing(p);
    form.setFieldsValue({
      name: p.name,
      brand: p.brand ?? undefined,
      categoryId: p.category?.id ?? p.categoryId,
      tags: p.tags ?? [],
      unit: p.unit,
      hsnCode: p.hsnCode ?? undefined,
      gstRatePercent: p.gstRatePercent,
      mrp: p.mrpPaise != null ? p.mrpPaise / 100 : undefined,
      moqQty: p.moqQty,
      description: p.description ?? undefined,
      imageUrl: p.imageUrl ?? undefined,
      isActive: p.isActive,
    });
    setOpen(true);
  };

  const submit = async () => {
    const v = await form.validateFields();
    const payload: ProductInput = {
      name: v.name,
      brand: v.brand,
      categoryId: v.categoryId,
      tags: v.tags ?? [],
      unit: v.unit,
      hsnCode: v.hsnCode,
      gstRatePercent: v.gstRatePercent,
      mrpPaise: v.mrp != null ? Math.round(v.mrp * 100) : null,
      moqQty: v.moqQty,
      description: v.description,
      imageUrl: v.imageUrl,
      isActive: v.isActive,
    };
    try {
      if (editing) await updateProduct(editing.id, payload);
      else await createProduct(payload);
      message.success(editing ? 'Product updated' : 'Product created');
      setOpen(false);
      refresh();
    } catch (err) {
      message.error((err as Error).message ?? 'Failed to save');
    }
  };

  const doUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadImage(file);
      form.setFieldsValue({ imageUrl: url });
      message.success('Image uploaded');
    } catch (err) {
      message.error((err as Error).message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
    return false; // prevent antd's default upload
  };

  const columns: ColumnsType<Product> = [
    {
      title: 'Product',
      key: 'name',
      render: (_, p) => (
        <Space>
          <Avatar shape="square" size={40} src={p.imageUrl || undefined}>
            {p.name[0]}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600 }}>{p.name}</div>
            <Typography.Text type="secondary">
              {p.brand ?? '—'} · {p.category?.name ?? '—'}
            </Typography.Text>
            {p.tags && p.tags.length > 0 && (
              <div style={{ marginTop: 4 }}>
                {p.tags.slice(0, 4).map((t) => (
                  <Tag key={t} style={{ marginInlineEnd: 4 }}>
                    {t}
                  </Tag>
                ))}
              </div>
            )}
          </div>
        </Space>
      ),
    },
    { title: 'Unit', dataIndex: 'unit', key: 'unit', render: (u: string) => <Tag>{u}</Tag> },
    {
      title: 'GST',
      dataIndex: 'gstRatePercent',
      key: 'gst',
      render: (g: number, p) => (
        <span>
          {g}%{p.hsnCode ? <Typography.Text type="secondary"> · HSN {p.hsnCode}</Typography.Text> : null}
        </span>
      ),
    },
    { title: 'MOQ', dataIndex: 'moqQty', key: 'moq' },
    {
      title: 'Stocked in',
      key: 'stores',
      render: (_, p) => {
        const n = p._count?.storeProducts ?? 0;
        return n > 0 ? <Tag color="blue">{n} store{n > 1 ? 's' : ''}</Tag> : <Tag>Not stocked</Tag>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (a: boolean) => (a ? <Tag color="green">Active</Tag> : <Tag>Inactive</Tag>),
    },
    ...(canEditCatalog
      ? [
          {
            title: 'Actions',
            key: 'actions',
            render: (_: unknown, p: Product) => (
              <Space>
                <Button size="small" type="link" onClick={() => openEdit(p)}>
                  Edit
                </Button>
                {isAdmin && (
                  <Popconfirm
                    title="Delete this product?"
                    description="Removes it from the catalog and all stores."
                    onConfirm={async () => {
                      try {
                        await deleteProduct(p.id);
                        message.success('Deleted');
                        refresh();
                      } catch (err) {
                        message.error((err as Error).message ?? 'Failed');
                      }
                    }}
                  >
                    <Button size="small" type="link" danger>
                      Delete
                    </Button>
                  </Popconfirm>
                )}
              </Space>
            ),
          },
        ]
      : []),
  ];

  return (
    <Card
      title="Catalog"
      extra={
        <Space>
          {canEditCatalog && (
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              New product
            </Button>
          )}
          <Input.Search
            placeholder="Search products…"
            allowClear
            onSearch={(v) => {
              setSearch(v);
              setPage(1);
            }}
            style={{ width: 240 }}
          />
        </Space>
      }
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Price and stock are managed per store."
        description={
          <>
            This is the shared catalog. Set each product's price, stock and tiers per store under{' '}
            <Link to="/stores">Stores → Manage → Inventory</Link>.
          </>
        }
      />
      <Table<Product>
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
        title={editing ? 'Edit product' : 'New product'}
        open={open}
        onOk={submit}
        onCancel={() => setOpen(false)}
        okText={editing ? 'Save' : 'Create'}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item label="Image">
            <Space align="start">
              <Form.Item name="imageUrl" noStyle>
                <Input placeholder="Image URL, or upload →" style={{ width: 320 }} />
              </Form.Item>
              <Upload showUploadList={false} accept="image/*" beforeUpload={doUpload}>
                <Button icon={<UploadOutlined />} loading={uploading}>
                  Upload
                </Button>
              </Upload>
            </Space>
            <Form.Item shouldUpdate noStyle>
              {() => {
                const url = form.getFieldValue('imageUrl');
                return url ? (
                  <Avatar shape="square" size={64} src={url} style={{ marginTop: 8 }} />
                ) : null;
              }}
            </Form.Item>
          </Form.Item>

          <Form.Item name="name" label="Name" rules={[{ required: true, min: 2 }]}>
            <Input placeholder="Women's Cotton Kurti" />
          </Form.Item>
          <Space style={{ display: 'flex' }} align="start">
            <Form.Item name="brand" label="Brand">
              <Input placeholder="NH Basics" />
            </Form.Item>
            <Form.Item name="categoryId" label="Category" rules={[{ required: true }]} style={{ minWidth: 240 }}>
              <Select
                showSearch
                optionFilterProp="label"
                placeholder="Select category"
                options={(categories ?? []).map((c) => ({ value: c.id, label: c.name }))}
                dropdownRender={(menu) => (
                  <>
                    {menu}
                    <Divider style={{ margin: '8px 0' }} />
                    <Space style={{ padding: '0 8px 4px' }}>
                      <Input
                        placeholder="New category name"
                        value={newCat}
                        onChange={(e) => setNewCat(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        onPressEnter={addCategory}
                        style={{ width: 180 }}
                      />
                      <Button
                        type="text"
                        icon={<PlusOutlined />}
                        loading={addingCat}
                        onClick={addCategory}
                      >
                        Add
                      </Button>
                    </Space>
                  </>
                )}
              />
            </Form.Item>
          </Space>
          <Form.Item
            name="tags"
            label="Search tags"
            tooltip="Keywords customers can search by — type a word and press Enter"
          >
            <Select
              mode="tags"
              open={false}
              suffixIcon={null}
              tokenSeparators={[',']}
              placeholder="cotton, festive, kids…"
            />
          </Form.Item>
          <Space style={{ display: 'flex' }} align="start">
            <Form.Item name="unit" label="Unit" rules={[{ required: true }]}>
              <Select style={{ width: 130 }} options={UNITS.map((u) => ({ value: u, label: u }))} />
            </Form.Item>
            <Form.Item name="gstRatePercent" label="GST %" rules={[{ required: true }]}>
              <Select style={{ width: 100 }} options={GST_SLABS.map((g) => ({ value: g, label: `${g}%` }))} />
            </Form.Item>
            <Form.Item name="hsnCode" label="HSN">
              <Input placeholder="6109" style={{ width: 120 }} />
            </Form.Item>
          </Space>
          <Space style={{ display: 'flex' }} align="start">
            <Form.Item name="mrp" label="MRP (₹)">
              <InputNumber min={0} style={{ width: 140 }} />
            </Form.Item>
            <Form.Item name="moqQty" label="Min order qty" rules={[{ required: true, type: 'number', min: 1 }]}>
              <InputNumber min={1} style={{ width: 140 }} />
            </Form.Item>
            <Form.Item name="isActive" label="Active" valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
          </Space>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Short description…" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
