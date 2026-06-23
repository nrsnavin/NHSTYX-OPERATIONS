import { useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Dropdown, Layout, Menu, theme, Typography } from 'antd';
import {
  AppstoreOutlined,
  DashboardOutlined,
  LogoutOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../store/auth.store';
import { logout as apiLogout } from '../api/auth.api';
import type { Role } from '../types';

const { Header, Sider, Content } = Layout;

interface NavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  roles: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { key: '/', label: 'Dashboard', icon: <DashboardOutlined />, roles: ['ADMIN', 'AGENT'] },
  { key: '/products', label: 'Products', icon: <AppstoreOutlined />, roles: ['ADMIN', 'AGENT'] },
  { key: '/orders', label: 'Orders', icon: <ShoppingCartOutlined />, roles: ['ADMIN', 'AGENT'] },
  { key: '/customers', label: 'Customers', icon: <TeamOutlined />, roles: ['ADMIN', 'AGENT'] },
];

export function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, clear } = useAuthStore();
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  const menuItems = useMemo(
    () =>
      NAV_ITEMS.filter((item) => !user || item.roles.includes(user.role)).map((item) => ({
        key: item.key,
        icon: item.icon,
        label: <Link to={item.key}>{item.label}</Link>,
      })),
    [user],
  );

  const handleLogout = async () => {
    try {
      await apiLogout();
    } catch {
      // ignore — clear client state regardless
    } finally {
      clear();
      navigate('/login', { replace: true });
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} theme="dark">
        <div
          style={{
            height: 48,
            margin: 16,
            color: '#fff',
            fontWeight: 700,
            fontSize: collapsed ? 16 : 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {collapsed ? 'NH' : 'NH Styx'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography.Text strong>Operations Console</Typography.Text>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'logout',
                  icon: <LogoutOutlined />,
                  label: 'Sign out',
                  onClick: handleLogout,
                },
              ],
            }}
          >
            <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar icon={<UserOutlined />} />
              <span>
                {user?.name ?? user?.email}{' '}
                <Typography.Text type="secondary">({user?.role})</Typography.Text>
              </span>
            </span>
          </Dropdown>
        </Header>
        <Content style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
