import { Modal, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useProductMovements, type ProductMovement } from '../api/products.api';

interface Props {
  productId: string;
  productName: string;
  open: boolean;
  onClose: () => void;
}

const TYPE_COLOR: Record<ProductMovement['type'], string> = {
  SALE: 'red',
  RESTOCK: 'green',
  ADJUSTMENT: 'blue',
  RELEASE: 'gold',
};

export function ProductLedgerModal({ productId, productName, open, onClose }: Props) {
  const { data, isLoading } = useProductMovements(open ? productId : undefined);

  const columns: ColumnsType<ProductMovement> = [
    {
      title: 'When',
      dataIndex: 'createdAt',
      key: 'when',
      render: (d: string) =>
        new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
    },
    { title: 'Store', key: 'store', render: (_, r) => r.store?.name ?? '—' },
    {
      title: 'Variant',
      key: 'variant',
      render: (_, r) =>
        r.variant ? <Tag>{r.variant.name}</Tag> : <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (t: ProductMovement['type']) => <Tag color={TYPE_COLOR[t]}>{t}</Tag>,
    },
    {
      title: 'Qty',
      dataIndex: 'deltaQty',
      key: 'qty',
      align: 'right',
      render: (d: number) => (
        <span style={{ color: d < 0 ? '#b3261e' : '#1a7f37', fontWeight: 600 }}>
          {d > 0 ? `+${d}` : d}
        </span>
      ),
    },
    {
      title: 'Reason',
      key: 'reason',
      render: (_, r) =>
        r.order ? (
          <Typography.Text>Order {r.order.orderNumber}</Typography.Text>
        ) : (
          <Typography.Text type="secondary">{r.reason ?? '—'}</Typography.Text>
        ),
    },
    { title: 'By', key: 'by', render: (_, r) => r.user?.name ?? 'System' },
  ];

  return (
    <Modal
      title={`Stock ledger — ${productName}`}
      open={open}
      onCancel={onClose}
      footer={null}
      width={780}
      destroyOnClose
    >
      <Table<ProductMovement>
        rowKey="id"
        size="small"
        loading={isLoading}
        columns={columns}
        dataSource={data ?? []}
        pagination={{ pageSize: 12, showSizeChanger: false }}
        locale={{ emptyText: 'No stock movements yet' }}
      />
    </Modal>
  );
}
