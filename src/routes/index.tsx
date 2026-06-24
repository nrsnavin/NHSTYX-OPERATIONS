import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { ProductsPage } from '../pages/ProductsPage';
import { StoresPage } from '../pages/StoresPage';
import { LeadsPage } from '../pages/LeadsPage';
import { OrdersPage } from '../pages/OrdersPage';
import { CustomersPage } from '../pages/CustomersPage';
import { StaffPage } from '../pages/StaffPage';
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
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/staff" element={<StaffPage />} />
        </Route>
      </Route>

      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
