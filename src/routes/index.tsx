import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { ProductsPage } from '../pages/ProductsPage';
import { StoresPage } from '../pages/StoresPage';
import { LeadsPage } from '../pages/LeadsPage';
import { QuotationsPage } from '../pages/QuotationsPage';
import { PurchasingPage } from '../pages/PurchasingPage';
import { OrdersPage } from '../pages/OrdersPage';
import { ReturnsPage } from '../pages/ReturnsPage';
import { ReceivablesPage } from '../pages/ReceivablesPage';
import { ReportsPage } from '../pages/ReportsPage';
import { AgentPerformancePage } from '../pages/AgentPerformancePage';
import { CustomersPage } from '../pages/CustomersPage';
import { StaffPage } from '../pages/StaffPage';
import { AuditPage } from '../pages/AuditPage';
import { CouponsPage } from '../pages/CouponsPage';
import { SettingsPage } from '../pages/SettingsPage';
import { NotFoundPage } from '../pages/NotFoundPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Staff-only console. */}
      <Route element={<ProtectedRoute roles={['ADMIN', 'AGENT']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/stores" element={<StoresPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/returns" element={<ReturnsPage />} />
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/quotations" element={<QuotationsPage />} />
          <Route path="/purchasing" element={<PurchasingPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/receivables" element={<ReceivablesPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/agent-performance" element={<AgentPerformancePage />} />
        </Route>
      </Route>

      {/* Admin-only console. */}
      <Route element={<ProtectedRoute roles={['ADMIN']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/staff" element={<StaffPage />} />
          <Route path="/coupons" element={<CouponsPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
