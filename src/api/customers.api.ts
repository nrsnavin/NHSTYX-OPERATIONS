import { useQuery } from '@tanstack/react-query';
import { api } from './axios';
import type { Customer, PaginatedResponse } from '../types';

interface CustomerQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export async function fetchCustomers(
  params: CustomerQuery = {},
): Promise<PaginatedResponse<Customer>> {
  const { data } = await api.get<PaginatedResponse<Customer>>('/customers', { params });
  return data;
}

export function useCustomers(params: CustomerQuery = {}) {
  return useQuery({
    queryKey: ['customers', params],
    queryFn: () => fetchCustomers(params),
  });
}
