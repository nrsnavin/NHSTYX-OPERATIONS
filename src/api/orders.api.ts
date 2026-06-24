import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './axios';
import type { ApiEnvelope, Order, OrderStatus, PaginatedResponse, PaymentMethod } from '../types';

interface OrderQuery {
  page?: number;
  limit?: number;
  status?: OrderStatus;
}

export async function fetchOrders(params: OrderQuery = {}): Promise<PaginatedResponse<Order>> {
  const { data } = await api.get<PaginatedResponse<Order>>('/orders', { params });
  return data;
}

export function useOrders(params: OrderQuery = {}) {
  return useQuery({
    queryKey: ['orders', params],
    queryFn: () => fetchOrders(params),
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      api.patch(`/orders/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export async function fetchOrder(id: string): Promise<Order> {
  const { data } = await api.get<ApiEnvelope<Order>>(`/orders/${id}`);
  return data.data;
}

/** Fetches the GST invoice PDF (with auth) and opens it in a new tab. */
export async function openInvoice(id: string): Promise<void> {
  const res = await api.get(`/orders/${id}/invoice`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data as Blob);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function useOrder(id: string | null) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: () => fetchOrder(id as string),
    enabled: Boolean(id),
  });
}

/** Records a verified payment (e.g. a confirmed bank transfer) — marks it PAID
 *  and auto-confirms the order. */
export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; method: PaymentMethod; amountPaise: number; reference?: string }) =>
      api.post(`/orders/${input.id}/payments`, {
        method: input.method,
        amountPaise: input.amountPaise,
        reference: input.reference,
      }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['order', v.id] });
    },
  });
}
