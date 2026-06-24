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
  minQty: number;
  pricePaise: number;
}

/** Shared catalog product. Price & stock are per-store (see StoreInventoryItem). */
export interface Product {
  id: string;
  name: string;
  description?: string | null;
  brand?: string | null;
  unit: ProductUnit;
  hsnCode?: string | null;
  gstRatePercent: number;
  mrpPaise?: number | null;
  moqQty: number;
  imageUrl?: string | null;
  isActive: boolean;
  categoryId?: string;
  category?: { id: string; name: string };
  _count?: { storeProducts: number };
  createdAt: string;
}

export interface StoreSummary {
  id: string;
  name: string;
  city: string;
  code?: string;
}

export interface ServiceArea {
  id: string;
  city: string;
  label: string;
  storeId: string;
}

export interface Store {
  id: string;
  name: string;
  code: string;
  phone?: string | null;
  addressLine?: string | null;
  city: string;
  state: string;
  stateCode: string;
  pincode?: string | null;
  isActive: boolean;
  serviceAreas: ServiceArea[];
  _count?: { agents: number; customers: number; inventory: number };
  createdAt: string;
}

export interface Agent {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  storeId?: string | null;
  store?: StoreSummary | null;
}

/** A catalog product with this store's price/stock attached (null = not stocked). */
export interface StoreInventoryItem {
  productId: string;
  name: string;
  brand?: string | null;
  unit: ProductUnit;
  gstRatePercent: number;
  moqQty: number;
  mrpPaise?: number | null;
  imageUrl?: string | null;
  categoryName?: string | null;
  stocked: boolean;
  storeProduct: {
    pricePaise: number;
    mrpPaise?: number | null;
    stockQty: number;
    isActive: boolean;
    priceTiers: PriceTier[];
  } | null;
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

export type PaymentState = 'CREATED' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface Payment {
  id: string;
  method: PaymentMethod;
  amountPaise: number;
  status: PaymentState;
  reference?: string | null;
  note?: string | null;
  razorpayPaymentId?: string | null;
  paidAt?: string | null;
  createdAt: string;
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
  customer?: { shopName: string; phone: string; gstin?: string | null };
  store?: StoreSummary | null;
  items: OrderItem[];
  payments?: Payment[];
  createdAt: string;
}

export type CustomerStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Customer {
  id: string;
  shopName: string;
  ownerName?: string | null;
  phone: string;
  email?: string | null;
  gstin?: string | null;
  status: CustomerStatus;
  creditApproved: boolean;
  creditLimitPaise: number;
  creditDays: number;
  isActive: boolean;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  storeId?: string | null;
  store?: StoreSummary | null;
  _count?: { orders: number };
}
