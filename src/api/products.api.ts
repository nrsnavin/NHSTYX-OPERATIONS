import { useQuery } from '@tanstack/react-query';
import { api } from './axios';
import type { PaginatedResponse, Product } from '../types';

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
