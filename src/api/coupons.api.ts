import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './axios';

export type CouponType = 'PERCENT' | 'FIXED';

export interface Coupon {
  id: string;
  code: string;
  description?: string | null;
  type: CouponType;
  value: number; // PERCENT: whole percent; FIXED: paise
  minOrderPaise: number;
  maxDiscountPaise?: number | null;
  usageLimit?: number | null;
  perCustomerLimit?: number | null;
  usedCount: number;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive: boolean;
  storeId?: string | null;
  store?: { name: string } | null;
  createdAt: string;
  _count?: { redemptions: number };
}

export interface CouponInput {
  code: string;
  description?: string;
  type: CouponType;
  value: number;
  minOrderPaise?: number;
  maxDiscountPaise?: number | null;
  usageLimit?: number | null;
  perCustomerLimit?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  storeId?: string | null;
  isActive?: boolean;
}

export function useCoupons() {
  return useQuery({
    queryKey: ['coupons'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Coupon[] }>('/coupons');
      return data.data;
    },
  });
}

export function useCreateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CouponInput) => {
      const { data } = await api.post<{ data: Coupon }>('/coupons', input);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coupons'] }),
  });
}

export function useUpdateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<CouponInput> }) => {
      const { data } = await api.patch<{ data: Coupon }>(`/coupons/${id}`, input);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coupons'] }),
  });
}

export function useDeleteCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/coupons/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coupons'] }),
  });
}
