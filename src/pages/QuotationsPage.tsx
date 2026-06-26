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
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CopyOutlined, MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useQueryClient } from '@tanstack/react-query';
import {
  convertQuotation,
  createQuotation,
  setQuotationStatus,
  updateQuotation,
  useQuotation,
  useQuotations,
} from '../api/quotations.api';
import { useCustomers } from '../api/customers.api';
import { useProducts } from '../api/products.api';
import { useLeads } from '../api/crm.api';
import { formatPaise } from '../lib/money';
import type { Quotation, QuotationStatus } from '../types';

const STATUSES: QuotationStatus[] = ['DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CONVERTED'];
const STATUS_COLOR: Record<QuotationStatus, string> = {
  DRAFT: 'default',
  SENT: 'blue',
  ACCEPTED: 'green',
  DECLINED: 'red',
  EXPIRED: 'orange',
  CONVERTED: 'purple',
};

const recipientOf = (q: Quotation) => q.customer?.shopName ?? q.lead?.shopName ?? '—';
const recipientPhone = (q: Quotation) => q.customer?.phone ?? q.lead?.phone ?? '';

export function QuotationsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<QuotationStatus | undefined>(undefined);
  const [selected, setSelected] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Quotation | null>(null);

  const { data, isLoading } = useQuotations({
    page,
    limit: 10,
    search: search || undefined,
    status,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['quotations'] });

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (q: Quotation) => {
    setEditing(q);
    setFormOpen(true);
  };

  const columns: ColumnsType<Quotation> = [
    {
      title: 'Quote #',
      key: 'quoteNumber',
      render: (_, q) => (
        <Button type="link" style={{ padding: 0 }} onClick={() => setSelected(q.id)}>
          <Typography.Text strong>{q.quoteNumber}</Typography.Text>
        </Button>
      ),
    },
    {
      title: 'Recipient',
      key: 'recipient',
      render: (_, q) => (
        <div>
          <div>{recipientOf(q)}</div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {recipientPhone(q)}
            {q.lead && !q.customer ? ' · prospect' : ''}
          </Typography.Text>
        </div>
      ),
    },
    { title: 'Items', key: 'items', render: (_, q) => q.items.length },
    { title: 'Total', key: 'total', render: (_, q) => formatPaise(q.totalPaise) },
    {
      title: 'Status',
      key: 'status',
      render: (_, q) => (
        <Space direction="vertical" size={0}>
          <Tag color={STATUS_COLOR[q.status]}>{q.status}</Tag>
          {q.orderNumber && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {q.orderNumber}
            </Typography.Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Created',
      key: 'createdAt',
      render: (_, q) => dayjs(q.createdAt).format('DD MMM'),
    },
  ];

  return (
    <Card
      title="Quotations"
      extra={
        <Space>
          <Input.Search
            placeholder="Search quote # / shop…"
            allowClear
            onSearch={(v) => {
              setSearch(v);
              setPage(1);
            }}
            style={{ width: 220 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            New quotation
          </Button>
        </Space>
      }
    >
      <Space wrap style={{ marginBottom: 16 }}>
        <Button type={status === undefined ? 'primary' : 'default'} onClick={() => { setStatus(undefined); setPage(1); }}>
          All
        </Button>
        {STATUSES.map((s) => (
          <Button key={s} type={status === s ? 'primary' : 'default'} onClick={() => { setStatus(s); setPage(1); }}>
            {s}
          </Button>
        ))}
      </Space>

      <Table<Quotation>
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

      <QuotationFormModal
        open={formOpen}
        editing={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          refresh();
        }}
      />
      <QuotationDrawer
        id={selected}
        onClose={() => setSelected(null)}
        onChanged={refresh}
        onEdit={(q) => {
          setSelected(null);
          openEdit(q);
        }}
      />
    </Card>
  );
}

// ---- Build / edit modal -----------------------------------------------------

function QuotationFormModal({
  open,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean;
  editing: Quotation | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form] = Form.useForm();
  const [recipientType, setRecipientType] = useState<'customer' | 'lead'>('customer');
  const [custSearch, setCustSearch] = useState('');
  const [leadSearch, setLeadSearch] = useState('');
  const [prodSearch, setProdSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: customers } = useCustomers({ status: 'APPROVED', search: custSearch || undefined, limit: 20 });
  const { data: leads } = useLeads({ search: leadSearch || undefined, limit: 20 });
  const { data: products } = useProducts({ search: prodSearch || undefined, limit: 30 });

  const isEdit = Boolean(editing);

  // Make sure the products referenced by an edited quote always have a label,
  // even before the product search returns them.
  const productOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of products?.items ?? []) {
      map.set(p.id, `${p.name}${p.brand ? ` · ${p.brand}` : ''}`);
    }
    if (editing) {
      for (const it of editing.items) {
        if (!map.has(it.productId)) {
          map.set(it.productId, `${it.productName}${it.variantName ? ` · ${it.variantName}` : ''}`);
        }
      }
    }
    return [...map].map(([value, label]) => ({ value, label }));
  }, [products, editing]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setRecipientType(editing.customer ? 'customer' : 'lead');
      form.setFieldsValue({
        title: editing.title ?? undefined,
        notes: editing.notes ?? undefined,
        validUntil: editing.validUntil ? dayjs(editing.validUntil) : undefined,
        discount: editing.discountPaise ? editing.discountPaise / 100 : undefined,
        items: editing.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPricePaise / 100,
        })),
      });
    } else {
      setRecipientType('customer');
      form.resetFields();
    }
  }, [open, editing, form]);

  const submit = async () => {
    const v = await form.validateFields();
    setSubmitting(true);
    try {
      const items = (v.items ?? []).map((it: { productId: string; quantity: number; unitPrice?: number }) => ({
        productId: it.productId,
        quantity: it.quantity,
        unitPricePaise: it.unitPrice != null ? Math.round(it.unitPrice * 100) : undefined,
      }));
      const common = {
        title: v.title || undefined,
        notes: v.notes || undefined,
        validUntil: v.validUntil ? v.validUntil.toISOString() : null,
        discountPaise: v.discount != null ? Math.round(v.discount * 100) : 0,
        items,
      };
      if (editing) {
        await updateQuotation(editing.id, common);
        message.success('Quotation updated');
      } else {
        await createQuotation({
          ...common,
          customerId: recipientType === 'customer' ? v.customerId : undefined,
          leadId: recipientType === 'lead' ? v.leadId : undefined,
        });
        message.success('Quotation created');
      }
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
      title={isEdit ? `Edit ${editing?.quoteNumber}` : 'New quotation'}
      open={open}
      onOk={submit}
      confirmLoading={submitting}
      onCancel={onClose}
      okText={isEdit ? 'Save changes' : 'Create quotation'}
      width={680}
    >
      <Form form={form} layout="vertical">
        {!isEdit && (
          <Form.Item label="Recipient">
            <Segmented
              value={recipientType}
              onChange={(val) => setRecipientType(val as 'customer' | 'lead')}
              options={[
                { label: 'Customer', value: 'customer' },
                { label: 'Prospect (lead)', value: 'lead' },
              ]}
              style={{ marginBottom: 8 }}
            />
            {recipientType === 'customer' ? (
              <Form.Item name="customerId" rules={[{ required: true, message: 'Pick a customer' }]} noStyle>
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
            ) : (
              <Form.Item name="leadId" rules={[{ required: true, message: 'Pick a lead' }]} noStyle>
                <Select
                  showSearch
                  filterOption={false}
                  onSearch={setLeadSearch}
                  placeholder="Search prospect shop / phone"
                  options={(leads?.items ?? []).map((l) => ({
                    value: l.id,
                    label: `${l.shopName} · ${l.phone}${l.city ? ` · ${l.city}` : ''}`,
                  }))}
                />
              </Form.Item>
            )}
          </Form.Item>
        )}
        {isEdit && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message={`For ${editing?.customer?.shopName ?? editing?.lead?.shopName ?? 'recipient'} · only draft quotes can be edited`}
          />
        )}

        <Form.Item name="title" label="Title (optional)">
          <Input placeholder="e.g. Diwali bulk order proposal" />
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
                    style={{ minWidth: 320 }}
                  >
                    <Select
                      showSearch
                      filterOption={false}
                      onSearch={setProdSearch}
                      placeholder="Search product"
                      options={productOptions}
                    />
                  </Form.Item>
                  <Form.Item name={[field.name, 'quantity']} rules={[{ required: true, type: 'number', min: 1 }]}>
                    <InputNumber min={1} placeholder="Qty" style={{ width: 80 }} />
                  </Form.Item>
                  <Form.Item name={[field.name, 'unitPrice']} tooltip="Leave blank to use the store price">
                    <InputNumber min={0} prefix="₹" placeholder="Unit price" style={{ width: 130 }} />
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

        <Space style={{ display: 'flex', marginTop: 16 }} align="start">
          <Form.Item name="discount" label="Discount (₹, optional)" tooltip="Lump-sum off the total">
            <InputNumber min={0} style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="validUntil" label="Valid until">
            <DatePicker format="DD MMM YYYY" style={{ width: 180 }} />
          </Form.Item>
        </Space>
        <Form.Item name="notes" label="Notes / terms (optional)">
          <Input.TextArea rows={2} placeholder="Payment terms, delivery window, etc." />
        </Form.Item>
        <Alert
          type="info"
          showIcon
          message="Prices default to the store price; override a line to quote a negotiated rate. GST is computed automatically."
        />
      </Form>
    </Modal>
  );
}

// ---- Detail drawer ----------------------------------------------------------

function QuotationDrawer({
  id,
  onClose,
  onChanged,
  onEdit,
}: {
  id: string | null;
  onClose: () => void;
  onChanged: () => void;
  onEdit: (q: Quotation) => void;
}) {
  const qc = useQueryClient();
  const { data: quote, isLoading } = useQuotation(id);
  const [converting, setConverting] = useState(false);
  const [payMethod, setPayMethod] = useState<'CREDIT' | 'BANK_TRANSFER'>('BANK_TRANSFER');
  const [busy, setBusy] = useState(false);

  const reload = () => {
    qc.invalidateQueries({ queryKey: ['quotation', id] });
    onChanged();
  };

  const changeStatus = async (status: QuotationStatus) => {
    if (!quote) return;
    setBusy(true);
    try {
      await setQuotationStatus(quote.id, status);
      message.success(`Marked ${status.toLowerCase()}`);
      reload();
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? (e as Error).message ?? 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const doConvert = async () => {
    if (!quote) return;
    setBusy(true);
    try {
      const { order } = await convertQuotation(quote.id, { paymentMethod: payMethod });
      message.success(`Order ${order.orderNumber} created`);
      setConverting(false);
      reload();
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? (e as Error).message ?? 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const shareText = (q: Quotation) => {
    const lines = [
      `*${q.quoteNumber}*${q.title ? ` — ${q.title}` : ''}`,
      `For: ${recipientOf(q)}`,
      '',
      ...q.items.map(
        (i) => `• ${i.productName}${i.variantName ? ` (${i.variantName})` : ''} × ${i.quantity} = ${formatPaise(i.lineTotalPaise)}`,
      ),
      '',
      `Subtotal: ${formatPaise(q.subtotalPaise)}`,
      `GST: ${formatPaise(q.cgstPaise + q.sgstPaise + q.igstPaise)}`,
      ...(q.discountPaise ? [`Discount: -${formatPaise(q.discountPaise)}`] : []),
      `*Total: ${formatPaise(q.totalPaise)}*`,
      ...(q.validUntil ? ['', `Valid until ${dayjs(q.validUntil).format('DD MMM YYYY')}`] : []),
      ...(q.notes ? ['', q.notes] : []),
    ];
    return lines.join('\n');
  };

  const copyShare = async () => {
    if (!quote) return;
    try {
      await navigator.clipboard.writeText(shareText(quote));
      message.success('Quote copied — paste into WhatsApp/email');
    } catch {
      message.error('Could not copy');
    }
  };

  const taxPaise = quote ? quote.cgstPaise + quote.sgstPaise + quote.igstPaise : 0;
  const isLeadOnly = quote ? !quote.customerId : false;
  const isFinal = quote ? ['CONVERTED', 'DECLINED', 'EXPIRED'].includes(quote.status) : false;

  return (
    <Drawer
      title={quote ? quote.quoteNumber : 'Quotation'}
      width={560}
      open={Boolean(id)}
      onClose={onClose}
      loading={isLoading}
      extra={
        quote ? (
          <Button icon={<CopyOutlined />} onClick={copyShare}>
            Copy / share
          </Button>
        ) : null
      }
    >
      {quote && (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Space wrap>
            <Tag color={STATUS_COLOR[quote.status]}>{quote.status}</Tag>
            {quote.store && <Tag color="blue">{quote.store.city}</Tag>}
            {quote.lead && !quote.customer && <Tag>Prospect</Tag>}
          </Space>

          <Descriptions size="small" column={1} bordered>
            <Descriptions.Item label="For">{recipientOf(quote)}</Descriptions.Item>
            <Descriptions.Item label="Phone">{recipientPhone(quote) || '—'}</Descriptions.Item>
            {quote.title && <Descriptions.Item label="Title">{quote.title}</Descriptions.Item>}
            {quote.validUntil && (
              <Descriptions.Item label="Valid until">
                {dayjs(quote.validUntil).format('DD MMM YYYY')}
              </Descriptions.Item>
            )}
            {quote.orderNumber && (
              <Descriptions.Item label="Order">{quote.orderNumber}</Descriptions.Item>
            )}
          </Descriptions>

          <Table
            size="small"
            rowKey="id"
            pagination={false}
            dataSource={quote.items}
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
              { title: 'Qty', dataIndex: 'quantity', key: 'qty', width: 56 },
              { title: 'Rate', key: 'rate', width: 90, render: (_, it) => formatPaise(it.unitPricePaise) },
              { title: 'Amount', key: 'amt', width: 100, render: (_, it) => formatPaise(it.lineTotalPaise) },
            ]}
          />

          <Descriptions size="small" column={1}>
            <Descriptions.Item label="Subtotal">{formatPaise(quote.subtotalPaise)}</Descriptions.Item>
            <Descriptions.Item label="GST">{formatPaise(taxPaise)}</Descriptions.Item>
            {quote.discountPaise > 0 && (
              <Descriptions.Item label="Discount">−{formatPaise(quote.discountPaise)}</Descriptions.Item>
            )}
            <Descriptions.Item label="Total">
              <Typography.Text strong>{formatPaise(quote.totalPaise)}</Typography.Text>
            </Descriptions.Item>
          </Descriptions>

          {quote.notes && (
            <Alert type="info" message={quote.notes} style={{ whiteSpace: 'pre-wrap' }} />
          )}

          {!isFinal && (
            <>
              <Divider style={{ margin: '4px 0' }} />
              <Space wrap>
                {quote.status === 'DRAFT' && (
                  <>
                    <Button onClick={() => onEdit(quote)}>Edit</Button>
                    <Button type="primary" ghost loading={busy} onClick={() => changeStatus('SENT')}>
                      Mark sent
                    </Button>
                  </>
                )}
                {quote.status === 'SENT' && (
                  <>
                    <Button type="primary" ghost loading={busy} onClick={() => changeStatus('ACCEPTED')}>
                      Mark accepted
                    </Button>
                    <Button danger loading={busy} onClick={() => changeStatus('DECLINED')}>
                      Mark declined
                    </Button>
                  </>
                )}
                <Button
                  type="primary"
                  disabled={isLeadOnly}
                  title={isLeadOnly ? 'Convert the lead to a customer first' : undefined}
                  onClick={() => setConverting(true)}
                >
                  Convert to order
                </Button>
              </Space>
              {isLeadOnly && (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  This quote is for a prospect — convert the lead to a customer before raising an order.
                </Typography.Text>
              )}
            </>
          )}
        </Space>
      )}

      <Modal
        title="Convert quotation to order"
        open={converting}
        onOk={doConvert}
        confirmLoading={busy}
        onCancel={() => setConverting(false)}
        okText="Create order"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Typography.Text>
            An order will be raised at the quoted prices, shipping to the customer's default address.
          </Typography.Text>
          <Select<'CREDIT' | 'BANK_TRANSFER'>
            value={payMethod}
            onChange={setPayMethod}
            style={{ width: '100%' }}
            options={[
              { value: 'BANK_TRANSFER', label: 'Bank transfer' },
              { value: 'CREDIT', label: 'Credit (if approved)' },
            ]}
          />
          <Alert
            type="info"
            showIcon
            message="Online payment can be collected from the Orders screen after the order is created."
          />
        </Space>
      </Modal>
    </Drawer>
  );
}
