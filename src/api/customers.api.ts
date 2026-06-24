import { useQuery } from '@tanstack/react-query';
import { api } from './axios';
import type { ApiEnvelope, Customer, CustomerStatus, PaginatedResponse } from '../types';

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
