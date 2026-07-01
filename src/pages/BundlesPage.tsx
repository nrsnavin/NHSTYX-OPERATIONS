import { useState } from 'react';
import {
  Button,
  Card,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
  message,
} from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import {
  useBundles,
  useCreateBundle,
  useDeleteBundle,
  useUpdateBundle,
  type Bundle,
  type BundleInput,
} from '../api/bundles.api';
import { useProducts } from '../api/products.api';

interface BundleForm {
  name: string;
  description?: string;
  isActive: boolean;
  items: { productId: string; quantity: number }[];
}

export function BundlesPage() {
  const { data: bundles, isLoading } = useBundles();
  const del = useDeleteBundle();
  const [editing, setEditing] = useState<Bundle | null>(null);
  const [creating, setCreating] = useState(false);

  const onDelete = async (id: string) => {
    try {
      await del.mutateAsync(id);
      message.success('Bundle deleted');
    } catch (e) {
      message.error((e as Error).message ?? 'Failed to delete');
    }
  };

  return (
    <Card
      title="Bundles & kits"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreating(true)}>
          New bundle
        </Button>
      }
    >
      <Typography.Paragraph type="secondary">
        Curated product sets buyers can add to their cart in one tap. Pricing follows each store's
        own prices.
      </Typography.Paragraph>
      <List<Bundle>
        loading={isLoading}
        locale={{ emptyText: <Empty description="No bundles yet" /> }}
        grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2, xl: 3 }}
        dataSource={bundles ?? []}
        renderItem={(b) => (
          <List.Item>
            <Card
              size="small"
              title={
                <Space>
                  {b.name}
                  {!b.isActive && <Tag>Hidden</Tag>}
                </Space>
              }
              actions={[
                <Button key="edit" type="link" onClick={() => setEditing(b)}>
                  Edit
                </Button>,
                <Popconfirm key="del" title="Delete this bundle?" onConfirm={() => onDelete(b.id)}>
                  <Button type="link" danger>
                    Delete
                  </Button>
                </Popconfirm>,
              ]}
            >
              {b.description && (
                <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
                  {b.description}
                </Typography.Paragraph>
              )}
              <Space direction="vertical" size={2} style={{ width: '100%' }}>
                {b.items.map((it) => (
                  <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{it.product.name}</span>
                    <Typography.Text type="secondary">× {it.quantity}</Typography.Text>
                  </div>
                ))}
              </Space>
            </Card>
          </List.Item>
        )}
      />

      <BundleModal
        open={creating || Boolean(editing)}
        bundle={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />
    </Card>
  );
}

function BundleModal({
  open,
  bundle,
  onClose,
}: {
  open: boolean;
  bundle: Bundle | null;
  onClose: () => void;
}) {
  const [form] = Form.useForm<BundleForm>();
  const [search, setSearch] = useState('');
  const { data: products } = useProducts({ search: search || undefined, limit: 30 });
  const create = useCreateBundle();
  const update = useUpdateBundle();
  const saving = create.isPending || update.isPending;

  const initial: BundleForm = bundle
    ? {
        name: bundle.name,
        description: bundle.description ?? undefined,
        isActive: bundle.isActive,
        items: bundle.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      }
    : { name: '', isActive: true, items: [{ productId: '', quantity: 1 }] };

  const submit = async () => {
    const v = await form.validateFields();
    const payload: BundleInput = {
      name: v.name.trim(),
      description: v.description?.trim() || null,
      isActive: v.isActive,
      items: v.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    };
    try {
      if (bundle) await update.mutateAsync({ id: bundle.id, ...payload });
      else await create.mutateAsync(payload);
      message.success(bundle ? 'Bundle updated' : 'Bundle created');
      onClose();
    } catch (e) {
      message.error((e as Error).message ?? 'Failed to save bundle');
    }
  };

  // Keep the product picker populated with any products already in the bundle.
  const productOptions = [
    ...(products?.items ?? []).map((p) => ({ value: p.id, label: `${p.name}${p.brand ? ` · ${p.brand}` : ''}` })),
    ...(bundle?.items ?? [])
      .filter((it) => !(products?.items ?? []).some((p) => p.id === it.productId))
      .map((it) => ({ value: it.productId, label: it.product.name })),
  ];

  return (
    <Modal
      title={bundle ? `Edit — ${bundle.name}` : 'New bundle'}
      open={open}
      onOk={submit}
      confirmLoading={saving}
      onCancel={onClose}
      okText={bundle ? 'Save' : 'Create'}
      width={620}
      destroyOnClose
    >
      <Form form={form} layout="vertical" requiredMark="optional" initialValues={initial}>
        <Form.Item name="name" label="Bundle name" rules={[{ required: true, min: 2 }]}>
          <Input placeholder="Boutique Starter Kit" />
        </Form.Item>
        <Form.Item name="description" label="Description">
          <Input.TextArea rows={2} placeholder="What's in the kit and who it's for" />
        </Form.Item>

        <div style={{ marginBottom: 8, fontWeight: 600 }}>Products</div>
        <Form.List name="items">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field) => (
                <Space key={field.key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                  <Form.Item
                    name={[field.name, 'productId']}
                    rules={[{ required: true, message: 'Pick a product' }]}
                    style={{ minWidth: 340 }}
                  >
                    <Select
                      showSearch
                      filterOption={false}
                      onSearch={setSearch}
                      placeholder="Search product"
                      options={productOptions}
                    />
                  </Form.Item>
                  <Form.Item
                    name={[field.name, 'quantity']}
                    rules={[{ required: true, type: 'number', min: 1 }]}
                  >
                    <InputNumber min={1} placeholder="Qty" />
                  </Form.Item>
                  {fields.length > 1 && <MinusCircleOutlined onClick={() => remove(field.name)} />}
                </Space>
              ))}
              <Button type="dashed" onClick={() => add({ quantity: 1 })} icon={<PlusOutlined />} block>
                Add product
              </Button>
            </>
          )}
        </Form.List>

        <Form.Item name="isActive" label="Visible to customers" valuePropName="checked" style={{ marginTop: 16 }}>
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}
