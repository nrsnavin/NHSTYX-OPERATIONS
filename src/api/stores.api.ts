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
