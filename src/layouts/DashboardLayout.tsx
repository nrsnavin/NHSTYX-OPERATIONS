import { useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Badge, Button, Dropdown, Layout, Menu, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { GlobalSearch } from '../components/GlobalSearch';
import {
  AppstoreOutlined,
  BellOutlined,
  BlockOutlined,
  DashboardOutlined,
  FileTextOutlined,
  FunnelPlotOutlined,
  AccountBookOutlined,
  BarChartOutlined,
  InboxOutlined,
  LineChartOutlined,
  LogoutOutlined,
  RollbackOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  TagsOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../store/auth.store';
import { useLowStock } from '../api/purchasing.api';
import { useStaffNotifications } from '../api/notifications.api';
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
  { key: '/products', label: 'Catalog', icon: <AppstoreOutlined />, roles: ['ADMIN', 'AGENT'] },
  { key: '/stores', label: 'Stores', icon: <ShopOutlined />, roles: ['ADMIN', 'AGENT'] },
  { key: '/orders', label: 'Orders', icon: <ShoppingCartOutlined />, roles: ['ADMIN', 'AGENT'] },
  { key: '/returns', label: 'Returns', icon: <RollbackOutlined />, roles: ['ADMIN', 'AGENT'] },
  { key: '/purchasing', label: 'Purchasing', icon: <InboxOutlined />, roles: ['ADMIN', 'AGENT'] },
  { key: '/leads', label: 'Leads', icon: <FunnelPlotOutlined />, roles: ['ADMIN', 'AGENT'] },
  { key: '/quotations', label: 'Quotations', icon: <FileTextOutlined />, roles: ['ADMIN', 'AGENT'] },
  { key: '/customers', label: 'Customers', icon: <TeamOutlined />, roles: ['ADMIN', 'AGENT'] },
  { key: '/receivables', label: 'Receivables', icon: <AccountBookOutlined />, roles: ['ADMIN', 'AGENT'] },
  { key: '/reports', label: 'Reports', icon: <BarChartOutlined />, roles: ['ADMIN', 'AGENT'] },
  { key: '/agent-performance', label: 'Agent performance', icon: <LineChartOutlined />, roles: ['ADMIN', 'AGENT'] },
  { key: '/notifications', label: 'Notifications', icon: <BellOutlined />, roles: ['ADMIN', 'AGENT'] },
  { key: '/staff', label: 'Staff', icon: <UserOutlined />, roles: ['ADMIN'] },
  { key: '/coupons', label: 'Coupons', icon: <TagsOutlined />, roles: ['ADMIN'] },
  { key: '/bundles', label: 'Bundles', icon: <BlockOutlined />, roles: ['ADMIN'] },
  { key: '/audit', label: 'Audit', icon: <SafetyCertificateOutlined />, roles: ['ADMIN'] },
  { key: '/settings', label: 'Settings', icon: <SettingOutlined />, roles: ['ADMIN'] },
];

const LINE = '#eef0f3';

const initials = (name?: string) =>
  (name ?? '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <Link
      to="/"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        height: 64,
        padding: collapsed ? 0 : '0 18px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderBottom: `1px solid ${LINE}`,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          flexShrink: 0,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #ff8a4c, #f2530a)',
          color: '#fff',
          fontWeight: 800,
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 10px rgba(242,83,10,0.35)',
        }}
      >
        NH
      </div>
      {!collapsed && (
        <div style={{ lineHeight: 1.1 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: '#1f2937' }}>NH Styx</div>
          <div style={{ fontSize: 11, color: '#9aa1ad', fontWeight: 600, letterSpacing: 0.3 }}>
            OPERATIONS
          </div>
        </div>
      )}
    </Link>
  );
}

/** Header bell showing the staff activity stream (new orders, payments, returns). */
function NotificationsBell() {
  const { data } = useStaffNotifications();
  const items = data ?? [];
  const recent = items.filter((n) => dayjs().diff(dayjs(n.createdAt), 'hour') < 24).length;
  const menu = {
    items:
      items.length === 0
        ? [{ key: 'empty', label: 'No notifications yet', disabled: true }]
        : items.slice(0, 10).map((n) => ({
            key: n.id,
            label: (
              <div style={{ maxWidth: 300, whiteSpace: 'normal', padding: '2px 0' }}>
                <div style={{ fontWeight: 600 }}>{n.title}</div>
                <div style={{ fontSize: 12, color: '#777' }}>{n.body}</div>
                <div style={{ fontSize: 11, color: '#aaa' }}>
                  {dayjs(n.createdAt).format('DD MMM, h:mm a')}
                </div>
              </div>
            ),
          })),
  };
  return (
    <Dropdown menu={menu} trigger={['click']} placement="bottomRight">
      <Badge count={recent} size="small" overflowCount={9}>
        <Button type="text" icon={<BellOutlined style={{ fontSize: 18 }} />} />
      </Badge>
    </Dropdown>
  );
}

export function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, clear } = useAuthStore();

  // Replenishment work waiting in Purchasing (store-scoped on the server).
  const { data: lowStockItems } = useLowStock();
  const lowStockCount = lowStockItems?.length ?? 0;

  const currentTitle = NAV_ITEMS.find((i) => i.key === location.pathname)?.label ?? 'Operations';

  const menuItems = useMemo(
    () =>
      NAV_ITEMS.filter((item) => !user || item.roles.includes(user.role)).map((item) => {
        const badge = item.key === '/purchasing' && lowStockCount > 0;
        return {
          key: item.key,
          // When collapsed the label (and its badge) is hidden, so mark the
          // icon with a dot instead.
          icon: badge && collapsed ? <Badge dot offset={[-2, 2]}>{item.icon}</Badge> : item.icon,
          label: (
            <Link to={item.key}>
              {item.label}
              {badge && (
                <Badge
                  count={lowStockCount}
                  size="small"
                  overflowCount={99}
                  style={{ marginInlineStart: 8 }}
                />
              )}
            </Link>
          ),
        };
      }),
    [user, lowStockCount, collapsed],
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
    <Layout style={{ minHeight: '100vh' }} hasSider>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="light"
        width={248}
        style={{
          borderRight: `1px solid ${LINE}`,
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflow: 'auto',
        }}
      >
        <Brand collapsed={collapsed} />
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          style={{ borderInlineEnd: 'none', padding: '12px 0' }}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: '#fff',
            borderBottom: `1px solid ${LINE}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <Typography.Text style={{ fontSize: 17, fontWeight: 700 }}>{currentTitle}</Typography.Text>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <GlobalSearch />
          <NotificationsBell />
          <Dropdown
            menu={{
              items: [
                { key: 'logout', icon: <LogoutOutlined />, label: 'Sign out', onClick: handleLogout },
              ],
            }}
          >
            <div
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '6px 10px 6px 6px',
                borderRadius: 999,
                border: `1px solid ${LINE}`,
              }}
            >
              <Avatar size={32} style={{ background: '#f2530a', fontWeight: 700, fontSize: 13 }}>
                {initials(user?.name ?? user?.email)}
              </Avatar>
              <div style={{ lineHeight: 1.15, marginRight: 2 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{user?.name ?? user?.email}</div>
                <Tag
                  color={user?.role === 'ADMIN' ? 'orange' : 'default'}
                  style={{ margin: 0, fontSize: 10, lineHeight: '16px', padding: '0 6px' }}
                >
                  {user?.role}
                </Tag>
              </div>
            </div>
          </Dropdown>
          </div>
        </Header>

        <Content style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
