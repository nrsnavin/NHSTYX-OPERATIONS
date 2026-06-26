import { useQuery } from '@tanstack/react-query';
import { api } from './axios';
import type {
  ApiEnvelope,
  LowStockItem,
  Pagination,
  PurchaseOrder,
  PurchaseOrderStatus,
  Supplier,
} from '../types';

// ---- Suppliers --------------------------------------------------------------

export async function fetchSuppliers(params: { search?: string; activeOnly?: boolean } = {}): Promise<Supplier[]> {
  const { data } = await api.get<{ success: boolean; items: Supplier[] }>('/purchasing/suppliers', { params });
  return data.items;
}

export function useSuppliers(params: { search?: string; activeOnly?: boolean } = {}) {
  return useQuery({ queryKey: ['suppliers', params], queryFn: () => fetchSuppliers(params) });
}

export interface SupplierInput {
  name: string;
  phone?: string;
  email?: string;
  gstin?: string;
  addressLine?: string;
}

export async function createSupplier(input: SupplierInput): Promise<Supplier> {
  const { data } = await api.post<ApiEnvelope<Supplier>>('/purchasing/suppliers', input);
  return data.data;
}

export async function updateSupplier(
  id: string,
  input: Partial<SupplierInput> & { isActive?: boolean },
): Promise<Supplier> {
  const { data } = await api.patch<ApiEnvelope<Supplier>>(`/purchasing/suppliers/${id}`, input);
  return data.data;
}

// ---- Low stock --------------------------------------------------------------

export async function fetchLowStock(storeId?: string): Promise<LowStockItem[]> {
  const { data } = await api.get<{ success: boolean; items: LowStockItem[] }>('/purchasing/low-stock', {
    params: storeId ? { storeId } : {},
  });
  return data.items;
}

export function useLowStock(storeId?: string, enabled = true) {
  return useQuery({ queryKey: ['low-stock', storeId], queryFn: () => fetchLowStock(storeId), enabled });
}

// ---- Purchase orders --------------------------------------------------------

export interface PurchaseOrdersResponse {
  success: boolean;
  items: PurchaseOrder[];
  pagination: Pagination;
}

interface PurchaseOrderQuery {
  page?: number;
  limit?: number;
  status?: PurchaseOrderStatus;
  supplierId?: string;
  search?: string;
}

export async function fetchPurchaseOrders(params: PurchaseOrderQuery = {}): Promise<PurchaseOrdersResponse> {
  const { data } = await api.get<PurchaseOrdersResponse>('/purchasing/orders', { params });
  return data;
}

export function usePurchaseOrders(params: PurchaseOrderQuery = {}) {
  return useQuery({ queryKey: ['purchase-orders', params], queryFn: () => fetchPurchaseOrders(params) });
}

export async function fetchPurchaseOrder(id: string): Promise<PurchaseOrder> {
  const { data } = await api.get<ApiEnvelope<PurchaseOrder>>(`/purchasing/orders/${id}`);
  return data.data;
}

export function usePurchaseOrder(id: string | null) {
  return useQuery({
    queryKey: ['purchase-order', id],
    queryFn: () => fetchPurchaseOrder(id as string),
    enabled: Boolean(id),
  });
}

export interface POItemInput {
  productId: string;
  variantId?: string | null;
  orderedQty: number;
  unitCostPaise: number;
}

export interface CreatePurchaseOrderInput {
  storeId?: string;
  supplierId: string;
  notes?: string;
  expectedAt?: string | null;
  items: POItemInput[];
}

export async function createPurchaseOrder(input: CreatePurchaseOrderInput): Promise<PurchaseOrder> {
  const { data } = await api.post<ApiEnvelope<PurchaseOrder>>('/purchasing/orders', input);
  return data.data;
}

export async function updatePurchaseOrder(
  id: string,
  input: Partial<Omit<CreatePurchaseOrderInput, 'storeId'>>,
): Promise<PurchaseOrder> {
  const { data } = await api.patch<ApiEnvelope<PurchaseOrder>>(`/purchasing/orders/${id}`, input);
  return data.data;
}

export async function setPurchaseOrderStatus(
  id: string,
  status: 'ORDERED' | 'CANCELLED',
): Promise<PurchaseOrder> {
  const { data } = await api.post<ApiEnvelope<PurchaseOrder>>(`/purchasing/orders/${id}/status`, { status });
  return data.data;
}

export async function receivePurchaseOrder(
  id: string,
  lines: { itemId: string; receiveQty: number }[],
): Promise<PurchaseOrder> {
  const { data } = await api.post<ApiEnvelope<PurchaseOrder>>(`/purchasing/orders/${id}/receive`, { lines });
  return data.data;
}
