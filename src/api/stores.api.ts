import { useQuery } from '@tanstack/react-query';
import { api } from './axios';
import type {
  Agent,
  ApiEnvelope,
  PaginatedResponse,
  PriceTier,
  Store,
  StoreInventoryItem,
} from '../types';

// ---- Stores ----

export async function fetchStores(): Promise<Store[]> {
  const { data } = await api.get<{ success: boolean; items: Store[] }>('/stores');
  return data.items;
}

export function useStores() {
  return useQuery({ queryKey: ['stores'], queryFn: fetchStores });
}

export interface StoreInput {
  name: string;
  code: string;
  phone?: string;
  addressLine?: string;
  city: string;
  state: string;
  stateCode: string;
  pincode?: string;
  isActive?: boolean;
}

export async function createStore(input: StoreInput): Promise<Store> {
  const { data } = await api.post<ApiEnvelope<Store>>('/stores', input);
  return data.data;
}

export async function updateStore(id: string, input: Partial<StoreInput>): Promise<Store> {
  const { data } = await api.patch<ApiEnvelope<Store>>(`/stores/${id}`, input);
  return data.data;
}

// ---- Service areas ----

export async function addServiceArea(storeId: string, city: string) {
  await api.post(`/stores/${storeId}/areas`, { city });
}

export async function removeServiceArea(areaId: string) {
  await api.delete(`/stores/areas/${areaId}`);
}

// ---- Inventory ----

interface InventoryQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export async function fetchStoreInventory(
  storeId: string,
  params: InventoryQuery = {},
): Promise<PaginatedResponse<StoreInventoryItem>> {
  const { data } = await api.get<PaginatedResponse<StoreInventoryItem>>(
    `/stores/${storeId}/inventory`,
    { params },
  );
  return data;
}

export function useStoreInventory(storeId: string | null, params: InventoryQuery = {}) {
  return useQuery({
    queryKey: ['store-inventory', storeId, params],
    queryFn: () => fetchStoreInventory(storeId as string, params),
    enabled: Boolean(storeId),
  });
}

export interface UpsertStoreProductInput {
  pricePaise: number;
  mrpPaise?: number | null;
  stockQty?: number;
  reorderLevel?: number;
  reorderQty?: number;
  isActive?: boolean;
  priceTiers?: PriceTier[];
}

export async function upsertStoreProduct(
  storeId: string,
  productId: string,
  input: UpsertStoreProductInput,
) {
  await api.put(`/stores/${storeId}/inventory/${productId}`, input);
}

export async function removeStoreProduct(storeId: string, productId: string) {
  await api.delete(`/stores/${storeId}/inventory/${productId}`);
}

// ---- Stock adjustments & stock-take ----

export interface AdjustStockInput {
  mode: 'delta' | 'set';
  quantity: number;
  reason?: string;
}

export interface AdjustStockResult {
  before: number;
  after: number;
  delta: number;
}

export async function adjustStock(
  storeId: string,
  productId: string,
  input: AdjustStockInput,
): Promise<AdjustStockResult> {
  const { data } = await api.post<ApiEnvelope<AdjustStockResult>>(
    `/stores/${storeId}/inventory/${productId}/adjust`,
    input,
  );
  return data.data;
}

export interface StockTakeResult {
  adjusted: number;
  unchanged: number;
  skipped: string[];
  lines: { productId: string; name: string; before: number; after: number; delta: number }[];
}

export async function stockTake(
  storeId: string,
  counts: { productId: string; countedQty: number }[],
  reason?: string,
): Promise<StockTakeResult> {
  const { data } = await api.post<ApiEnvelope<StockTakeResult>>(`/stores/${storeId}/stock-take`, {
    counts,
    reason,
  });
  return data.data;
}

export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export async function importInventory(storeId: string, file: File): Promise<ImportResult> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post<ApiEnvelope<ImportResult>>(
    `/stores/${storeId}/inventory/import`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data.data;
}

// ---- Stock ledger ----

export interface StockMovement {
  id: string;
  deltaQty: number;
  type: 'SALE' | 'RESTOCK' | 'ADJUSTMENT' | 'RELEASE';
  reason?: string | null;
  createdAt: string;
  product?: { id: string; name: string };
  user?: { name: string } | null;
  order?: { orderNumber: string } | null;
}

export async function fetchStockMovements(
  storeId: string,
  params: { productId?: string; page?: number; limit?: number } = {},
): Promise<PaginatedResponse<StockMovement>> {
  const { data } = await api.get<PaginatedResponse<StockMovement>>(
    `/stores/${storeId}/movements`,
    { params },
  );
  return data;
}

export function useStockMovements(
  storeId: string | null,
  params: { productId?: string; page?: number; limit?: number } = {},
) {
  return useQuery({
    queryKey: ['store-movements', storeId, params],
    queryFn: () => fetchStockMovements(storeId as string, params),
    enabled: Boolean(storeId),
  });
}

// ---- Agents ----

export async function fetchAgents(): Promise<Agent[]> {
  const { data } = await api.get<{ success: boolean; items: Agent[] }>('/stores/agents');
  return data.items;
}

export function useAgents() {
  return useQuery({ queryKey: ['agents'], queryFn: fetchAgents });
}

export async function assignAgent(storeId: string, userId: string) {
  await api.post(`/stores/${storeId}/agents`, { userId });
}

export async function unassignAgent(userId: string) {
  await api.delete(`/stores/agents/${userId}`);
}
