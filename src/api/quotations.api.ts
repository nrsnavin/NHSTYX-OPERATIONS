import { useQuery } from '@tanstack/react-query';
import { api } from './axios';
import type { ApiEnvelope, Order, Pagination, Quotation, QuotationStatus } from '../types';

export interface QuotationsResponse {
  success: boolean;
  items: Quotation[];
  pagination: Pagination;
}

interface QuotationQuery {
  page?: number;
  limit?: number;
  status?: QuotationStatus;
  search?: string;
  customerId?: string;
}

export async function fetchQuotations(params: QuotationQuery = {}): Promise<QuotationsResponse> {
  const { data } = await api.get<QuotationsResponse>('/quotations', { params });
  return data;
}

export function useQuotations(params: QuotationQuery = {}) {
  return useQuery({ queryKey: ['quotations', params], queryFn: () => fetchQuotations(params) });
}

export async function fetchQuotation(id: string): Promise<Quotation> {
  const { data } = await api.get<ApiEnvelope<Quotation>>(`/quotations/${id}`);
  return data.data;
}

export function useQuotation(id: string | null) {
  return useQuery({
    queryKey: ['quotation', id],
    queryFn: () => fetchQuotation(id as string),
    enabled: Boolean(id),
  });
}

export interface QuotationItemInput {
  productId: string;
  variantId?: string | null;
  quantity: number;
  unitPricePaise?: number;
}

export interface CreateQuotationInput {
  customerId?: string;
  leadId?: string;
  title?: string;
  notes?: string;
  validUntil?: string | null;
  discountPaise?: number;
  items: QuotationItemInput[];
}

export async function createQuotation(input: CreateQuotationInput): Promise<Quotation> {
  const { data } = await api.post<ApiEnvelope<Quotation>>('/quotations', input);
  return data.data;
}

export async function updateQuotation(
  id: string,
  input: Partial<Omit<CreateQuotationInput, 'customerId' | 'leadId'>>,
): Promise<Quotation> {
  const { data } = await api.patch<ApiEnvelope<Quotation>>(`/quotations/${id}`, input);
  return data.data;
}

export async function setQuotationStatus(id: string, status: QuotationStatus): Promise<Quotation> {
  const { data } = await api.post<ApiEnvelope<Quotation>>(`/quotations/${id}/status`, { status });
  return data.data;
}

export async function convertQuotation(
  id: string,
  input: { paymentMethod: 'CREDIT' | 'BANK_TRANSFER'; addressId?: string },
): Promise<{ order: Order; quotation: Quotation }> {
  const { data } = await api.post<ApiEnvelope<{ order: Order; quotation: Quotation }>>(
    `/quotations/${id}/convert`,
    input,
  );
  return data.data;
}

/** Opens the quotation PDF in a new tab. */
export async function openQuotationPdf(id: string): Promise<void> {
  const res = await api.get(`/quotations/${id}/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data as Blob);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
