import { useEffect, useState } from 'react';
import {
  Button,
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
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined } from '@ant-design/icons';
import { useStores } from '../api/stores.api';
import {
  useCreateVariant,
  useDeleteVariant,
  useStoreVariants,
  useUpsertStoreVariant,
  type StoreVariantRow,
} from '../api/variants.api';

interface Props {
  productId: string;
  productName: string;
  open: boolean;
  onClose: () => void;
}

interface RowEdit {
  price?: number; // rupees
  stock?: number;
}

export function VariantsModal({ productId, productName, open, onClose }: Props) {
  const { data: stores } = useStores();
  const [storeId, setStoreId] = useState<string>();

  useEffect(() => {
    if (!storeId && stores && stores.length) setStoreId(stores[0].id);
  }, [stores, storeId]);

  const { data: rows, isLoading } = useStoreVariants(storeId, productId);
  const createVariant = useCreateVariant(productId);
  const deleteVariant = useDeleteVariant(productId);
  const upsert = useUpsertStoreVariant(storeId ?? '', productId);

  const [edits, setEdits] = useState<Record<string, RowEdit>>({});
  const [form] = Form.useForm<{ name: string; sku?: string; mrp?: number }>();

  // Reset local price/stock edits whenever the store's rows change.
  useEffect(() => {
    const next: Record<string, RowEdit> = {};
    for (const r of rows ?? []) {
      next[r.id] = {
        price: r.storeVariant ? r.storeVariant.pricePaise / 100 : undefined,
        stock: r.storeVariant?.stockQty ?? undefined,
      };
    }
    setEdits(next);
  }, [rows]);

  const setEdit = (id: string, patch: RowEdit) =>
    setEdits((e) => ({ ...e, [id]: { ...e[id], ...patch } }));

  const addVariant = async () => {
    const v = await form.validateFields();
    try {
      await createVariant.mutateAsync({
        name: v.name.trim(),
        sku: v.sku?.trim() || undefined,
        mrpPaise: v.mrp != null ? Math.round(v.mrp * 100) : null,
      });
      form.resetFields();
      message.success('Variant added');
    } catch (err) {
      message.error((err as Error).message ?? 'Failed to add variant');
    }
  };

  const saveStock = async (id: string) => {
    const e = edits[id];
    if (e?.price == null) {
      message.warning('Set a price first');
      return;
    }
    try {
      await upsert.mutateAsync({
        variantId: id,
        input: { pricePaise: Math.round(e.price * 100), stockQty: e.stock ?? 0 },
      });
      message.success('Saved for this store');
    } catch (err) {
      message.error((err as Error).message ?? 'Failed to save');
    }
  };

  const columns: ColumnsType<StoreVariantRow> = [
    {
      title: 'Variant',
      key: 'name',
      render: (_, r) => (
        <div>
          <Typography.Text strong>{r.name}</Typography.Text>
          {!r.isActive && (
            <Tag style={{ marginLeft: 6 }}>inactive</Tag>
          )}
          {r.sku && (
            <div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {r.sku}
              </Typography.Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Price (₹)',
      key: 'price',
      width: 120,
      render: (_, r) => (
        <InputNumber
          min={0}
          value={edits[r.id]?.price}
          onChange={(v) => setEdit(r.id, { price: v ?? undefined })}
          style={{ width: 100 }}
        />
      ),
    },
    {
      title: 'Stock',
      key: 'stock',
      width: 110,
      render: (_, r) => (
        <InputNumber
          min={0}
          value={edits[r.id]?.stock}
          onChange={(v) => setEdit(r.id, { stock: v ?? undefined })}
          style={{ width: 90 }}
        />
      ),
    },
    {
      title: '',
      key: 'actions',
      align: 'right',
      render: (_, r) => (
        <Space>
          <Button size="small" type="link" loading={upsert.isPending} onClick={() => saveStock(r.id)}>
            Save
          </Button>
          <Popconfirm title="Remove this variant?" onConfirm={() => deleteVariant.mutate(r.id)}>
            <Button size="small" type="link" danger>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Modal
      title={`Variants — ${productName}`}
      open={open}
      onCancel={onClose}
      footer={<Button onClick={onClose}>Done</Button>}
      width={680}
      destroyOnClose
    >
      <Space style={{ marginBottom: 12 }}>
        <Typography.Text>Store:</Typography.Text>
        <Select
          style={{ width: 240 }}
          value={storeId}
          onChange={setStoreId}
          options={(stores ?? []).map((s) => ({ value: s.id, label: `${s.name} (${s.code})` }))}
        />
      </Space>

      <Table<StoreVariantRow>
        rowKey="id"
        size="small"
        loading={isLoading}
        columns={columns}
        dataSource={rows ?? []}
        pagination={false}
        locale={{ emptyText: 'No variants yet — add one below' }}
      />

      <Divider>Add a variant</Divider>
      <Form form={form} layout="inline" onFinish={addVariant}>
        <Form.Item name="name" rules={[{ required: true, message: 'Name' }]}>
          <Input placeholder="e.g. Red / M" />
        </Form.Item>
        <Form.Item name="sku">
          <Input placeholder="SKU (optional)" />
        </Form.Item>
        <Form.Item name="mrp">
          <InputNumber min={0} placeholder="MRP ₹" />
        </Form.Item>
        <Form.Item>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            htmlType="submit"
            loading={createVariant.isPending}
          >
            Add
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}
