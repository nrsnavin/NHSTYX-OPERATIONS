import { useState } from 'react';
import { Button, Card, DatePicker, Space, Typography, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import {
  downloadGstReport,
  downloadInventoryReport,
  downloadSalesReport,
} from '../api/reports.api';

const { RangePicker } = DatePicker;

export function ReportsPage() {
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const from = range?.[0]?.format('YYYY-MM-DD');
  const to = range?.[1]?.format('YYYY-MM-DD');

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      message.error((e as Error).message ?? 'Export failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card title="Reports & exports">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Typography.Text type="secondary">
            Period (applies to sales &amp; GST reports; leave empty for all time)
          </Typography.Text>
          <div style={{ marginTop: 6 }}>
            <RangePicker value={range ?? undefined} onChange={(v) => setRange(v as never)} />
          </div>
        </div>

        <Space wrap>
          <Button
            icon={<DownloadOutlined />}
            loading={busy === 'sales'}
            onClick={() => run('sales', () => downloadSalesReport(from, to))}
          >
            Sales register (CSV)
          </Button>
          <Button
            icon={<DownloadOutlined />}
            loading={busy === 'gst'}
            onClick={() => run('gst', () => downloadGstReport(from, to))}
          >
            GST summary (CSV)
          </Button>
          <Button
            icon={<DownloadOutlined />}
            loading={busy === 'inventory'}
            onClick={() => run('inventory', () => downloadInventoryReport())}
          >
            Inventory valuation (CSV)
          </Button>
        </Space>

        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          Sales register lists every order with tax split; GST summary is an
          invoice-wise taxable-value + CGST/SGST/IGST breakdown; inventory
          valuation is stock-on-hand × unit price per store. Agents get their
          own store; admins get all stores.
        </Typography.Paragraph>
      </Space>
    </Card>
  );
}
