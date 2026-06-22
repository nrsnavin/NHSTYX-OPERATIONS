import { Card, Empty, Typography } from 'antd';

/**
 * Placeholder for customer (store/boutique owner) management.
 * Wire this up to a `/customers` endpoint on the backend when ready.
 */
export function CustomersPage() {
  return (
    <Card title="Customers">
      <Empty
        description={
          <Typography.Text type="secondary">
            Customer management is coming soon. Build the <code>/customers</code> backend
            endpoint and list store &amp; boutique owners here.
          </Typography.Text>
        }
      />
    </Card>
  );
}
