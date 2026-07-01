import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './axios';
import type { ApiEnvelope } from '../types';

export interface BundleItem {
  id: string;
  productId: string;
  quantity: number;
  product: { id: string; name: string; brand: string | null; imageUrl: string | null };
}

export interface Bundle {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  items: BundleItem[];
}

export interface BundleInput {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  isActive?: boolean;
  items: { productId: string; quantity: number }[];
}

export function useBundles() {
  return useQuery({
    queryKey: ['bundles'],
    queryFn: async () => {
      const { data } = await api.get<{ items: Bundle[] }>('/bundles');
      return data.items;
    },
  });
}

export function useCreateBundle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: BundleInput) => {
      const { data } = await api.post<ApiEnvelope<Bundle>>('/bundles', input);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bundles'] }),
  });
}

export function useUpdateBundle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: BundleInput & { id: string }) => {
      const { data } = await api.put<ApiEnvelope<Bundle>>(`/bundles/${id}`, input);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bundles'] }),
  });
}

export function useDeleteBundle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/bundles/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bundles'] }),
  });
}
