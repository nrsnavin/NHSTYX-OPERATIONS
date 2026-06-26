import { useQuery } from '@tanstack/react-query';
import { api } from './axios';
import type {
  ApiEnvelope,
  Customer,
  CustomerInsights,
  CustomerStatus,
  PaginatedResponse,
} from '../types';

interface CustomerQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: CustomerStatus;
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

export interface ApproveInput {
  creditApproved?: boolean;
  creditLimitPaise?: number;
  creditDays?: number;
}

export async function approveCustomer(id: string, input: ApproveInput = {}): Promise<Customer> {
  const { data } = await api.post<ApiEnvelope<Customer>>(`/customers/${id}/approve`, input);
  return data.data;
}

export async function rejectCustomer(id: string, reason?: string): Promise<Customer> {
  const { data } = await api.post<ApiEnvelope<Customer>>(`/customers/${id}/reject`, { reason });
  return data.data;
}

/** Customer 360 metrics (RFM, spend, credit, top categories). */
export function useCustomerInsights(id?: string) {
  return useQuery({
    queryKey: ['customer-insights', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get<ApiEnvelope<CustomerInsights>>(`/customers/${id}/insights`);
      return data.data;
    },
  });
}

/** Mint a single-use win-back coupon for a shop; returns the code. */
export async function winbackCustomer(
  id: string,
  percent?: number,
): Promise<{ code: string; percent: number; endsAt?: string | null }> {
  const { data } = await api.post<ApiEnvelope<{ code: string; percent: number; endsAt?: string }>>(
    `/customers/${id}/winback`,
    { percent },
  );
  return data.data;
}

export interface UpdateCustomerInput {
  creditApproved?: boolean;
  creditLimitPaise?: number;
  creditDays?: number;
  isActive?: boolean;
}

export async function updateCustomer(id: string, input: UpdateCustomerInput): Promise<Customer> {
  const { data } = await api.patch<ApiEnvelope<Customer>>(`/customers/${id}`, input);
  return data.data;
}
