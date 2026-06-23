export type Role = 'ADMIN' | 'AGENT';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
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

export type ProductUnit = 'PIECE' | 'DOZEN' | 'PACK' | 'BOX' | 'SET' | 'KILOGRAM' | 'METER';

export interface PriceTier {
  id: string;
  minQty: number;
  pricePaise: number;
}

export interface Product {
  id: string;
  name: string;
  brand?: string | null;
  unit: ProductUnit;
  hsnCode?: string | null;
  gstRatePercent: number;
  mrpPaise?: number | null;
  pricePaise: number;
  moqQty: number;
  stockQty: number;
  isActive: boolean;
  category?: { id: string; name: string };
  priceTiers: PriceTier[];
  createdAt: string;
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PACKED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED';

export type OrderPaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'REFUNDED';

export type PaymentMethod = 'RAZORPAY' | 'COD' | 'CREDIT' | 'BANK_TRANSFER';

export interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPricePaise: number;
  lineTotalPaise: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  paymentMethod: PaymentMethod;
  subtotalPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalPaise: number;
  amountDuePaise: number;
  customer?: { shopName: string; phone: string };
  items: OrderItem[];
  createdAt: string;
}

export interface Customer {
  id: string;
  shopName: string;
  ownerName?: string | null;
  phone: string;
  email?: string | null;
  gstin?: string | null;
  creditLimitPaise: number;
  creditDays: number;
  isActive: boolean;
  createdAt: string;
  _count?: { orders: number };
}
