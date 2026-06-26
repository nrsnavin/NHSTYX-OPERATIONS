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

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: Role;
  isActive: boolean;
  storeId?: string | null;
  store?: { id: string; name: string; city: string; code?: string } | null;
  createdAt: string;
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
  tags?: string[];
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
    reorderLevel: number;
    reorderQty: number;
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
  productId?: string;
  variantId?: string | null;
  productName: string;
  variantName?: string | null;
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
  events?: OrderEvent[];
  returns?: OrderReturn[];
  // Shipment tracking (set when dispatched).
  courierName?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
}

export type ReturnStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'REFUNDED' | 'CANCELLED';

export interface OrderReturnItem {
  id: string;
  orderItemId: string;
  quantity: number;
  unitPricePaise: number;
  lineRefundPaise: number;
  orderItem?: OrderItem;
}

export interface OrderReturn {
  id: string;
  returnNumber: string;
  orderId: string;
  status: ReturnStatus;
  reason?: string | null;
  refundAmountPaise: number;
  refundMethod?: PaymentMethod | null;
  refundReference?: string | null;
  restocked: boolean;
  createdAt: string;
  processedAt?: string | null;
  items: OrderReturnItem[];
  order?: { orderNumber: string; totalPaise: number; paymentMethod: PaymentMethod };
  customer?: { shopName: string; phone: string };
}

export type NotificationAudience = 'CUSTOMER' | 'STAFF';

export interface AppNotification {
  id: string;
  audience: NotificationAudience;
  event: string;
  title: string;
  body: string;
  orderId?: string | null;
  status: 'SENT' | 'READ' | 'FAILED';
  createdAt: string;
}

export interface OrderEvent {
  id: string;
  status: OrderStatus;
  note?: string | null;
  createdAt: string;
  user?: { name: string } | null;
}

export type CustomerStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type LeadStage = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'WON' | 'LOST';
export type LeadSource = 'MANUAL' | 'SIGNUP';
export type ActivityType = 'NOTE' | 'CALL' | 'VISIT' | 'EMAIL';

export interface SourceAnalyticsRow {
  source: LeadSource;
  total: number;
  won: number;
  conversionRate: number;
}

export interface PipelineStageStat {
  stage: LeadStage;
  count: number;
  valuePaise: number;
}

export interface AgentLeaderRow {
  agentId: string;
  name: string;
  total: number;
  won: number;
  wonValuePaise: number;
}

export interface ConversionPoint {
  month: string;
  created: number;
  won: number;
}

export interface CrmAging {
  overdue: number;
  today: number;
  upcoming: number;
  later: number;
  none: number;
}

export interface CrmDashboardData {
  pipeline: PipelineStageStat[];
  leaderboard: AgentLeaderRow[];
  conversion: ConversionPoint[];
  aging: CrmAging;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  addressLine?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface LowStockItem {
  productId: string;
  storeId: string;
  storeName: string;
  storeCity: string;
  name: string;
  brand?: string | null;
  unit: ProductUnit;
  imageUrl?: string | null;
  stockQty: number;
  reorderLevel: number;
  reorderQty: number;
  pricePaise: number;
  suggestedQty: number;
}

export type PurchaseOrderStatus = 'DRAFT' | 'ORDERED' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseOrderItem {
  id: string;
  productId: string;
  variantId?: string | null;
  productName: string;
  variantName?: string | null;
  orderedQty: number;
  receivedQty: number;
  unitCostPaise: number;
  lineCostPaise: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  status: PurchaseOrderStatus;
  store?: StoreSummary | null;
  supplier?: { id: string; name: string; phone?: string | null } | null;
  createdBy?: { id: string; name: string } | null;
  notes?: string | null;
  expectedAt?: string | null;
  totalCostPaise: number;
  receivedAt?: string | null;
  items: PurchaseOrderItem[];
  createdAt: string;
  updatedAt: string;
}

export type QuotationStatus =
  | 'DRAFT'
  | 'SENT'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'EXPIRED'
  | 'CONVERTED';

export interface QuotationItem {
  id: string;
  productId: string;
  variantId?: string | null;
  productName: string;
  variantName?: string | null;
  unit: ProductUnit;
  quantity: number;
  unitPricePaise: number;
  gstRatePercent: number;
  lineSubtotalPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  lineTotalPaise: number;
}

export interface Quotation {
  id: string;
  quoteNumber: string;
  status: QuotationStatus;
  title?: string | null;
  notes?: string | null;
  validUntil?: string | null;
  customerId?: string | null;
  customer?: {
    id: string;
    shopName: string;
    phone: string;
    gstin?: string | null;
    creditApproved: boolean;
    creditLimitPaise: number;
    creditDays: number;
  } | null;
  leadId?: string | null;
  lead?: { id: string; shopName: string; phone: string } | null;
  store?: StoreSummary | null;
  createdBy?: { id: string; name: string } | null;
  placeOfSupply?: string | null;
  subtotalPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  discountPaise: number;
  totalPaise: number;
  orderId?: string | null;
  orderNumber?: string | null;
  items: QuotationItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  type: ActivityType;
  body: string;
  followUpAt?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  createdBy?: { id: string; name: string } | null;
  createdAt: string;
}

/** A VISIT activity with a GPS check-in, for the field-visit log. */
export interface FieldVisit extends Activity {
  lead?: { id: string; shopName: string; city?: string | null } | null;
  customer?: { id: string; shopName: string } | null;
}

export interface Lead {
  id: string;
  shopName: string;
  contactName?: string | null;
  phone: string;
  email?: string | null;
  city?: string | null;
  stage: LeadStage;
  source: LeadSource;
  estValuePaise: number;
  nextFollowUpAt?: string | null;
  lostReason?: string | null;
  store?: StoreSummary | null;
  assignedTo?: { id: string; name: string } | null;
  customer?: { id: string; status: CustomerStatus } | null;
  customerId?: string | null;
  activities?: Activity[];
  _count?: { activities: number };
  createdAt: string;
  updatedAt: string;
}

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
  // RFM enrichment attached by the customer list endpoint.
  segment?: CustomerSegment;
  ltvPaise?: number;
  orderCount?: number;
  lastOrderAt?: string | null;
}

export type CustomerSegment = 'NEW' | 'ACTIVE' | 'HIGH_VALUE' | 'AT_RISK' | 'DORMANT';

export interface CustomerInsights {
  customerId: string;
  shopName: string;
  segment: CustomerSegment;
  orderCount: number;
  ltvPaise: number;
  aovPaise: number;
  firstOrderAt?: string | null;
  lastOrderAt?: string | null;
  daysSinceLastOrder?: number | null;
  avgDaysBetweenOrders?: number | null;
  outstandingPaise: number;
  overduePaise: number;
  onTimePaymentRate?: number | null;
  creditLimitPaise: number;
  creditApproved: boolean;
  topCategories: { name: string; spendPaise: number }[];
}
