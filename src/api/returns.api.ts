import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './axios';
import type { ApiEnvelope, OrderReturn } from '../types';

export async function fetchReturns(): Promise<OrderReturn[]> {
  const { data } = await api.get<{ items: OrderReturn[] }>('/returns');
  return data.items;
}

export function useReturns() {
  return useQuery({ queryKey: ['returns'], queryFn: fetchReturns });
}

export async function fetchReturn(id: string): Promise<OrderReturn> {
  const { data } = await api.get<ApiEnvelope<OrderReturn>>(`/returns/${id}`);
  return data.data;
}

/** Processes the refund: restock + Razorpay/manual refund → REFUNDED. */
export function useRefundReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/returns/${id}/refund`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['returns'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useRejectReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.post(`/returns/${id}/reject`, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['returns'] }),
  });
}
