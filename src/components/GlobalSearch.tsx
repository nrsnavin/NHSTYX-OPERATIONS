import { useMemo, useRef, useState } from 'react';
import { AutoComplete, Input, Tag, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useGlobalSearch } from '../api/globalSearch.api';
import { formatPaise } from '../lib/money';

/** Header quick-search across orders, customers, products and leads. */
export function GlobalSearch() {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [term, setTerm] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const { data, isFetching } = useGlobalSearch(term);

  const onSearch = (v: string) => {
    setValue(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setTerm(v), 250);
  };

  const options = useMemo(() => {
    if (!data) return [];
    const groups: { label: React.ReactNode; options: { value: string; label: React.ReactNode }[] }[] =
      [];
    const header = (text: string, count: number) => (
      <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 600 }}>
        {text} · {count}
      </Typography.Text>
    );

    if (data.orders.length) {
      groups.push({
        label: header('Orders', data.orders.length),
        options: data.orders.map((o) => ({
          value: `order:${o.id}`,
          label: (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span>
                <strong>{o.orderNumber}</strong>
                {o.customer ? ` · ${o.customer.shopName}` : ''}
              </span>
              <span>
                <Tag>{o.status}</Tag>
                {formatPaise(o.totalPaise)}
              </span>
            </div>
          ),
        })),
      });
    }
    if (data.customers.length) {
      groups.push({
        label: header('Customers', data.customers.length),
        options: data.customers.map((c) => ({
          value: `customer:${c.id}`,
          label: (
            <span>
              <strong>{c.shopName}</strong> · {c.phone} <Tag>{c.status}</Tag>
            </span>
          ),
        })),
      });
    }
    if (data.products.length) {
      groups.push({
        label: header('Products', data.products.length),
        options: data.products.map((p) => ({
          value: `product:${p.id}`,
          label: (
            <span>
              <strong>{p.name}</strong>
              {p.brand ? ` · ${p.brand}` : ''}
            </span>
          ),
        })),
      });
    }
    if (data.leads.length) {
      groups.push({
        label: header('Leads', data.leads.length),
        options: data.leads.map((l) => ({
          value: `lead:${l.id}`,
          label: (
            <span>
              <strong>{l.shopName}</strong> · {l.phone} <Tag>{l.stage}</Tag>
            </span>
          ),
        })),
      });
    }
    return groups;
  }, [data]);

  const onSelect = (val: string) => {
    const [type, id] = val.split(':');
    setValue('');
    setTerm('');
    switch (type) {
      case 'order':
        navigate(`/orders?order=${id}`);
        break;
      case 'customer':
        navigate('/customers');
        break;
      case 'product':
        navigate('/products');
        break;
      case 'lead':
        navigate('/leads');
        break;
    }
  };

  const empty = term.trim().length >= 2 && !isFetching && options.length === 0;

  return (
    <AutoComplete
      value={value}
      options={options}
      onSearch={onSearch}
      onSelect={onSelect}
      popupMatchSelectWidth={420}
      style={{ width: 320 }}
      notFoundContent={empty ? 'No matches' : null}
    >
      <Input
        allowClear
        prefix={<SearchOutlined style={{ color: '#9aa1ad' }} />}
        placeholder="Search orders, customers, products…"
      />
    </AutoComplete>
  );
}
