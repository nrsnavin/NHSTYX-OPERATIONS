import { useQuery } from '@tanstack/react-query';
import { api } from './axios';
import type { ApiEnvelope, PaginatedResponse, Product, ProductUnit } from '../types';

interface ProductQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export async function fetchProducts(
  params: ProductQuery = {},
): Promise<PaginatedResponse<Product>> {
  const { data } = await api.get<PaginatedResponse<Product>>('/products', { params });
  return data;
}

export function useProducts(params: ProductQuery = {}) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => fetchProducts(params),
  });
}

export interface ProductInput {
  name: string;
  description?: string;
  brand?: string;
  categoryId: string;
  tags?: string[];
  unit?: ProductUnit;
  hsnCode?: string;
  gstRatePercent?: number;
  mrpPaise?: number | null;
  moqQty?: number;
  imageUrl?: string;
  isActive?: boolean;
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const { data } = await api.post<ApiEnvelope<Product>>('/products', input);
  return data.data;
}

export async function updateProduct(id: string, input: Partial<ProductInput>): Promise<Product> {
  const { data } = await api.patch<ApiEnvelope<Product>>(`/products/${id}`, input);
  return data.data;
}

export async function deleteProduct(id: string): Promise<void> {
  await api.delete(`/products/${id}`);
}

/** Uploads an image file and returns its hosted URL. */
export async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post<ApiEnvelope<{ url: string }>>('/uploads', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data.url;
}
