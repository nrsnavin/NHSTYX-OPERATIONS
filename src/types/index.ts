export type UserRole = 'ADMIN' | 'AGENT' | 'CUSTOMER';

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
  role: UserRole;
  status?: string;
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  items: T[];
  pagination: Pagination;
}

export interface ProductVariant {
  id: string;
  sku: string;
  size?: string | null;
  color?: string | null;
  price: string;
  mrp?: string | null;
  minOrderQty: number;
  stockQuantity: number;
  isActive: boolean;
}

export interface Product {
  id: string;
  name: string;
  brand?: string | null;
  isActive: boolean;
  category?: { id: string; name: string };
  variants: ProductVariant[];
  createdAt: string;
}

export type OrderStatus =
  | 'DRAFT'
  | 'PLACED'
  | 'CONFIRMED'
  | 'PACKED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED';

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: string;
  total: string;
  customer?: { businessName: string };
  items: { id: string; productName: string; quantity: number; lineTotal: string }[];
  createdAt: string;
}
