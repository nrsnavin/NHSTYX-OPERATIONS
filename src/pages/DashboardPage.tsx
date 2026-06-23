import { Card, Col, Row, Statistic, Typography } from 'antd';
import {
  AppstoreOutlined,
  ShoppingCartOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useProducts } from '../api/products.api';
import { useOrders } from '../api/orders.api';
import { useAuthStore } from '../store/auth.store';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const products = useProducts({ limit: 1 });
  const orders = useOrders({ limit: 1 });
  const pendingOrders = useOrders({ limit: 1, status: 'PENDING' });

  return (
    <div>
      <Typography.Title level={3}>Welcome back, {user?.name ?? 'there'} 👋</Typography.Title>
      <Typography.Paragraph type="secondary">
        Here&apos;s a quick snapshot of the NH Styx marketplace.
      </Typography.Paragraph>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Total Products"
              value={products.data?.pagination.total ?? 0}
              loading={products.isLoading}
              prefix={<AppstoreOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Total Orders"
              value={orders.data?.pagination.total ?? 0}
              loading={orders.isLoading}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Orders Awaiting Action"
              value={pendingOrders.data?.pagination.total ?? 0}
              loading={pendingOrders.isLoading}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
